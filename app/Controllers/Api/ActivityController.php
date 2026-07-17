<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Participant;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * Public recent-activity feed for the landing page (see
 * docs/API_FLIGHTMEET.md). A union of the latest meet creations, meet
 * joins, and global chat messages, newest first, capped at 10.
 */
class ActivityController extends BaseController
{
    private const LIMIT = 10;

    /**
     * GET /api/activity — public.
     */
    public function index(): ResponseInterface
    {
        $db = db_connect();

        $created = $db->query(
            'SELECT m.created_at, m.id AS meet_id, m.title,
                    u.id AS user_id, u.username, u.vorname, u.nachname
             FROM meets m
             JOIN users u ON u.id = m.created_by
             ORDER BY m.created_at DESC
             LIMIT ' . self::LIMIT,
        )->getResultArray();

        $joined = $db->query(
            'SELECT p.created_at, m.id AS meet_id, m.title,
                    u.id AS user_id, u.username, u.vorname, u.nachname
             FROM meet_participants p
             JOIN meets m ON m.id = p.meet_id
             JOIN users u ON u.id = p.user_id
             ORDER BY p.created_at DESC
             LIMIT ' . self::LIMIT,
        )->getResultArray();

        $messages = $db->query(
            'SELECT ms.created_at, ms.body,
                    u.id AS user_id, u.username, u.vorname, u.nachname
             FROM messages ms
             JOIN users u ON u.id = ms.user_id
             WHERE ms.group_id IS NULL
             ORDER BY ms.created_at DESC
             LIMIT ' . self::LIMIT,
        )->getResultArray();

        $events = [];

        foreach ($created as $row) {
            $events[] = $this->event('meet_created', $row['created_at'], [
                'user' => $this->user($row),
                'meet' => ['id' => (int) $row['meet_id'], 'title' => $row['title']],
            ]);
        }

        foreach ($joined as $row) {
            $events[] = $this->event('meet_joined', $row['created_at'], [
                'user' => $this->user($row),
                'meet' => ['id' => (int) $row['meet_id'], 'title' => $row['title']],
            ]);
        }

        foreach ($messages as $row) {
            $events[] = $this->event('message', $row['created_at'], [
                'user'    => $this->user($row),
                'excerpt' => mb_substr((string) $row['body'], 0, 90),
            ]);
        }

        // Newest first, then drop the sort key and cap at LIMIT.
        usort($events, static fn (array $a, array $b): int => $b['_ts'] <=> $a['_ts']);

        $events = array_slice($events, 0, self::LIMIT);

        return $this->response->setJSON([
            'data' => array_map(static function (array $event): array {
                unset($event['_ts']);

                return $event;
            }, $events),
        ]);
    }

    /**
     * @param array<string, mixed> $extra
     *
     * @return array<string, mixed> Carries a private `_ts` sort key that is
     *                              stripped before the response is returned.
     */
    private function event(string $type, string $createdAt, array $extra): array
    {
        $ts = strtotime($createdAt);

        return [
            '_ts'       => $ts,
            'type'      => $type,
            'createdAt' => date(DATE_ATOM, $ts),
            ...$extra,
        ];
    }

    private function user(array $row): array
    {
        return Participant::format([
            'id'       => $row['user_id'],
            'username' => $row['username'],
            'vorname'  => $row['vorname'],
            'nachname' => $row['nachname'],
        ]);
    }
}
