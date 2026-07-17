<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Participant;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * FlightMeet groups API (see docs/API_FLIGHTMEET.md).
 * Member counts are derived from group_members at read time (NFR-4).
 */
class GroupsController extends BaseController
{
    /**
     * GET /api/groups — all groups. Public.
     */
    public function index(): ResponseInterface
    {
        $userId = auth()->id() ?? 0;

        $rows = db_connect()->query(
            'SELECT g.*, COUNT(m.id) AS member_count,
                    COALESCE(MAX(m.user_id = ?), 0) AS joined
             FROM flight_groups g
             LEFT JOIN group_members m ON m.group_id = g.id
             GROUP BY g.id
             ORDER BY g.id ASC',
            [$userId],
        )->getResultArray();

        return $this->response->setJSON([
            'data' => array_map(fn (array $row): array => $this->summary($row), $rows),
        ]);
    }

    /**
     * GET /api/groups/{id} — detail incl. members. Public.
     */
    public function show(int $id): ResponseInterface
    {
        $group = $this->detail($id);

        if ($group === null) {
            return $this->groupNotFound();
        }

        return $this->response->setJSON(['group' => $group]);
    }

    /**
     * POST /api/groups — create a group; the creator auto-joins.
     * Session required. Duplicate name → 422.
     */
    public function create(): ResponseInterface
    {
        $data = $this->request->getJSON(true) ?? [];

        $validation = service('validation');
        $validation->setRules([
            'name'        => 'required|max_length[80]|is_unique[flight_groups.name]',
            'region'      => 'required|max_length[80]',
            'description' => 'required|max_length[5000]',
        ]);

        if (! $validation->run($data)) {
            return $this->response->setStatusCode(422)->setJSON([
                'errors' => $validation->getErrors(),
            ]);
        }

        $db  = db_connect();
        $now = date('Y-m-d H:i:s');

        $db->table('flight_groups')->insert([
            'name'        => $data['name'],
            'region'      => $data['region'],
            'description' => $data['description'],
            'created_by'  => auth()->id(),
            'created_at'  => $now,
            'updated_at'  => $now,
        ]);

        $id = (int) $db->insertID();

        $db->table('group_members')->insert([
            'group_id'   => $id,
            'user_id'    => auth()->id(),
            'created_at' => $now,
        ]);

        return $this->response->setStatusCode(201)->setJSON([
            'group' => $this->detail($id),
        ]);
    }

    /**
     * PUT /api/groups/{id} — edit name/region/description. Session required.
     * Allowed for the founder (creator) or an admin, 403 otherwise. The
     * unique-name check ignores the group itself.
     */
    public function update(int $id): ResponseInterface
    {
        $db    = db_connect();
        $group = $db->table('flight_groups')->where('id', $id)->get()->getRowArray();

        if ($group === null) {
            return $this->groupNotFound();
        }

        if ((int) $group['created_by'] !== auth()->id() && ! auth()->user()->inGroup('admin')) {
            return $this->response->setStatusCode(403)->setJSON([
                'error' => 'Only the founder can edit this group.',
            ]);
        }

        $data = $this->request->getJSON(true) ?? [];

        $validation = service('validation');
        $validation->setRules([
            'name'        => "required|max_length[80]|is_unique[flight_groups.name,id,{$id}]",
            'region'      => 'required|max_length[80]',
            'description' => 'required|max_length[5000]',
        ]);

        if (! $validation->run($data)) {
            return $this->response->setStatusCode(422)->setJSON([
                'errors' => $validation->getErrors(),
            ]);
        }

        $db->table('flight_groups')->where('id', $id)->update([
            'name'        => $data['name'],
            'region'      => $data['region'],
            'description' => $data['description'],
            'updated_at'  => date('Y-m-d H:i:s'),
        ]);

        return $this->response->setJSON(['group' => $this->detail($id)]);
    }

    /**
     * POST /api/groups/{id}/join — session required. 409 when already a member.
     */
    public function join(int $id): ResponseInterface
    {
        $db = db_connect();

        if ($db->table('flight_groups')->where('id', $id)->countAllResults() === 0) {
            return $this->groupNotFound();
        }

        $isMember = $db->table('group_members')
            ->where('group_id', $id)
            ->where('user_id', auth()->id())
            ->countAllResults() > 0;

        if ($isMember) {
            return $this->conflict('You are already a member of this group.');
        }

        $db->table('group_members')->insert([
            'group_id'   => $id,
            'user_id'    => auth()->id(),
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->response->setJSON(['group' => $this->detail($id)]);
    }

    /**
     * DELETE /api/groups/{id}/join — session required. 409 when not a member.
     */
    public function leave(int $id): ResponseInterface
    {
        $db = db_connect();

        if ($db->table('flight_groups')->where('id', $id)->countAllResults() === 0) {
            return $this->groupNotFound();
        }

        $db->table('group_members')
            ->where('group_id', $id)
            ->where('user_id', auth()->id())
            ->delete();

        if ($db->affectedRows() === 0) {
            return $this->conflict('You are not a member of this group.');
        }

        return $this->response->setJSON(['group' => $this->detail($id)]);
    }

    // --------------------------------------------------------------------

    /**
     * GroupSummary from a flight_groups row carrying the derived
     * member_count and joined columns.
     */
    private function summary(array $row): array
    {
        return [
            'id'          => (int) $row['id'],
            'name'        => $row['name'],
            'region'      => $row['region'],
            'description' => $row['description'],
            'image'       => $row['image'],
            'memberCount' => (int) $row['member_count'],
            'joined'      => (bool) $row['joined'],
        ];
    }

    /**
     * GroupDetail (summary + members, createdBy), or null when missing.
     */
    private function detail(int $id): ?array
    {
        $db     = db_connect();
        $userId = auth()->id() ?? 0;

        $row = $db->query(
            'SELECT g.*, COUNT(m.id) AS member_count,
                    COALESCE(MAX(m.user_id = ?), 0) AS joined
             FROM flight_groups g
             LEFT JOIN group_members m ON m.group_id = g.id
             WHERE g.id = ?
             GROUP BY g.id',
            [$userId, $id],
        )->getRowArray();

        if ($row === null) {
            return null;
        }

        $members = $db->query(
            'SELECT u.id, u.username, u.vorname, u.nachname
             FROM group_members m
             JOIN users u ON u.id = m.user_id
             WHERE m.group_id = ?
             ORDER BY m.id ASC',
            [$id],
        )->getResultArray();

        $creator = $db->table('users')
            ->select('id, username, vorname, nachname')
            ->where('id', (int) $row['created_by'])
            ->get()
            ->getRowArray();

        $detail              = $this->summary($row);
        $detail['members']   = array_map([Participant::class, 'format'], $members);
        $detail['createdBy'] = Participant::format($creator);

        return $detail;
    }

    private function groupNotFound(): ResponseInterface
    {
        return $this->response->setStatusCode(404)->setJSON(['error' => 'Group not found.']);
    }

    private function conflict(string $message): ResponseInterface
    {
        return $this->response->setStatusCode(409)->setJSON(['error' => $message]);
    }
}
