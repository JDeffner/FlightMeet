<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Participant;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * FlightMeet chat API (see docs/API_FLIGHTMEET.md).
 *
 * One global "All pilots" channel (messages.group_id NULL) plus one
 * channel per group. All routes are behind the `apiauth` filter; group
 * channels additionally require membership.
 */
class ChatController extends BaseController
{
    private const NO_AFTER_CAP = 100;

    /**
     * GET /api/chat/messages?groupId={id}&after={messageId}
     * Oldest→newest; capped at 100 messages per request in both branches.
     */
    public function index(): ResponseInterface
    {
        $groupId = $this->parseGroupId($this->request->getGet('groupId'));

        if ($groupId !== null && ($error = $this->requireMembership($groupId))) {
            return $error;
        }

        $params = [];
        $where  = 'ms.group_id IS NULL';

        if ($groupId !== null) {
            $where    = 'ms.group_id = ?';
            $params[] = $groupId;
        }

        $after   = $this->request->getGet('after');
        $reverse = false;

        // Both branches are capped: `after=0` would otherwise return the
        // whole channel. The client keeps paging with the new last id.
        $limit = 'LIMIT ' . self::NO_AFTER_CAP;

        if ($after !== null && $after !== '') {
            $where .= ' AND ms.id > ?';
            $params[] = (int) $after;
            $order    = 'ORDER BY ms.id ASC';
        } else {
            // Latest N, reversed below to oldest→newest.
            $order   = 'ORDER BY ms.id DESC';
            $reverse = true;
        }

        $rows = db_connect()->query(
            "SELECT ms.id, ms.body, ms.created_at, ms.user_id,
                    u.username, u.vorname, u.nachname
             FROM messages ms
             JOIN users u ON u.id = ms.user_id
             WHERE {$where} {$order} {$limit}",
            $params,
        )->getResultArray();

        if ($reverse) {
            $rows = array_reverse($rows);
        }

        $userId = auth()->id();

        return $this->response->setJSON([
            'data' => array_map(
                static fn (array $row): array => self::formatMessage($row, $userId),
                $rows,
            ),
        ]);
    }

    /**
     * POST /api/chat/messages — body { body, groupId? }.
     */
    public function create(): ResponseInterface
    {
        $data = $this->request->getJSON(true) ?? [];
        $body = trim((string) ($data['body'] ?? ''));

        if ($body === '') {
            return $this->response->setStatusCode(422)->setJSON([
                'errors' => ['body' => 'The message body is required.'],
            ]);
        }

        if (mb_strlen($body) > 2000) {
            return $this->response->setStatusCode(422)->setJSON([
                'errors' => ['body' => 'The message body may not exceed 2000 characters.'],
            ]);
        }

        $groupId = $this->parseGroupId($data['groupId'] ?? null);

        if ($groupId !== null && ($error = $this->requireMembership($groupId))) {
            return $error;
        }

        $db = db_connect();

        $db->table('messages')->insert([
            'group_id'   => $groupId,
            'user_id'    => auth()->id(),
            'body'       => $body,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        $row = $db->query(
            'SELECT ms.id, ms.body, ms.created_at, ms.user_id,
                    u.username, u.vorname, u.nachname
             FROM messages ms
             JOIN users u ON u.id = ms.user_id
             WHERE ms.id = ?',
            [(int) $db->insertID()],
        )->getRowArray();

        return $this->response->setStatusCode(201)->setJSON([
            'message' => self::formatMessage($row, auth()->id()),
        ]);
    }

    /**
     * DELETE /api/chat/messages/{id} — delete a message. Session required.
     * Own message or admin only (403 otherwise); 404 when unknown.
     */
    public function destroy(int $id): ResponseInterface
    {
        $db      = db_connect();
        $message = $db->table('messages')->select('id, user_id')->where('id', $id)->get()->getRowArray();

        if ($message === null) {
            return $this->response->setStatusCode(404)->setJSON(['error' => 'Message not found.']);
        }

        if ((int) $message['user_id'] !== auth()->id() && ! auth()->user()->inGroup('admin')) {
            return $this->response->setStatusCode(403)->setJSON([
                'error' => 'You can only delete your own messages.',
            ]);
        }

        $db->table('messages')->where('id', $id)->delete();

        return $this->response->setJSON(['ok' => true, 'id' => $id]);
    }

    // --------------------------------------------------------------------

    private function parseGroupId(mixed $value): ?int
    {
        return ($value === null || $value === '') ? null : (int) $value;
    }

    /**
     * 404 when the group does not exist, 403 when the current user is
     * not a member, null when access is fine.
     */
    private function requireMembership(int $groupId): ?ResponseInterface
    {
        $db = db_connect();

        if ($db->table('flight_groups')->where('id', $groupId)->countAllResults() === 0) {
            return $this->response->setStatusCode(404)->setJSON(['error' => 'Group not found.']);
        }

        $isMember = $db->table('group_members')
            ->where('group_id', $groupId)
            ->where('user_id', auth()->id())
            ->countAllResults() > 0;

        if (! $isMember) {
            return $this->response->setStatusCode(403)->setJSON([
                'error' => 'You are not a member of this group.',
            ]);
        }

        return null;
    }

    private static function formatMessage(array $row, int $userId): array
    {
        return [
            'id'        => (int) $row['id'],
            'body'      => $row['body'],
            'createdAt' => date(DATE_ATOM, strtotime($row['created_at'])),
            'mine'      => (int) $row['user_id'] === $userId,
            'author'    => Participant::format([
                'id'       => $row['user_id'],
                'username' => $row['username'],
                'vorname'  => $row['vorname'],
                'nachname' => $row['nachname'],
            ]),
        ];
    }
}
