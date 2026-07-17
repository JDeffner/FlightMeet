<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * Public pilot profiles (see docs/API_FLIGHTMEET.md).
 *
 * Exposes only public FlightMeet data — never email, address, or anything
 * private. Read at /api/users/{username}.
 */
class UsersController extends BaseController
{
    /**
     * GET /api/users/{username} — public pilot profile. 404 when unknown.
     */
    public function show(string $username): ResponseInterface
    {
        $db = db_connect();

        $user = $db->table('users')
            ->select('id, username, vorname, nachname, subscription_tier, created_at')
            ->where('username', $username)
            ->get()
            ->getRowArray();

        if ($user === null) {
            return $this->response->setStatusCode(404)->setJSON(['error' => 'User not found.']);
        }

        $userId = (int) $user['id'];

        // Flight groups this pilot is a member of, with derived member counts.
        $groups = $db->query(
            'SELECT g.id, g.name, g.region, COUNT(mc.id) AS member_count
             FROM group_members gm
             JOIN flight_groups g ON g.id = gm.group_id
             LEFT JOIN group_members mc ON mc.group_id = g.id
             WHERE gm.user_id = ?
             GROUP BY g.id
             ORDER BY g.id ASC',
            [$userId],
        )->getResultArray();

        // Meets this pilot created OR participates in, deduped, date DESC.
        $meets = $db->query(
            'SELECT m.id, m.title, m.spot, m.region, m.date, m.time, m.max_participants, m.created_by,
                    (SELECT COUNT(*) FROM meet_participants p WHERE p.meet_id = m.id) AS participant_count
             FROM meets m
             WHERE m.created_by = ?
                OR m.id IN (SELECT meet_id FROM meet_participants WHERE user_id = ?)
             ORDER BY m.date DESC, m.time DESC, m.id DESC',
            [$userId, $userId],
        )->getResultArray();

        $name = trim(($user['vorname'] ?? '') . ' ' . ($user['nachname'] ?? ''));

        return $this->response->setJSON([
            'user' => [
                'id'          => $userId,
                'username'    => $user['username'],
                'name'        => $name !== '' ? $name : $user['username'],
                'vorname'     => $user['vorname'],
                'nachname'    => $user['nachname'],
                'tier'        => $user['subscription_tier'] ?? 'pilot',
                'role'        => $this->highestRole($userId),
                'memberSince' => $user['created_at'] !== null
                    ? date(DATE_ATOM, strtotime($user['created_at']))
                    : null,
                'groups' => array_map(static fn (array $g): array => [
                    'id'          => (int) $g['id'],
                    'name'        => $g['name'],
                    'region'      => $g['region'],
                    'memberCount' => (int) $g['member_count'],
                ], $groups),
                'meets' => array_map(static fn (array $m): array => [
                    'id'               => (int) $m['id'],
                    'title'            => $m['title'],
                    'spot'             => $m['spot'],
                    'region'           => $m['region'],
                    'date'             => $m['date'],
                    'time'             => substr($m['time'], 0, 5),
                    'participantCount' => (int) $m['participant_count'],
                    'maxParticipants'  => (int) $m['max_participants'],
                    'organizer'        => (int) $m['created_by'] === $userId,
                ], $meets),
            ],
        ]);
    }

    /**
     * Highest Shield group for a user: admin > moderator > user.
     */
    private function highestRole(int $userId): string
    {
        $rows = db_connect()->table('auth_groups_users')
            ->where('user_id', $userId)
            ->get()
            ->getResultArray();

        $groups = array_column($rows, 'group');

        if (in_array('admin', $groups, true)) {
            return 'admin';
        }

        if (in_array('moderator', $groups, true)) {
            return 'moderator';
        }

        return 'user';
    }
}
