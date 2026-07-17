<?php

declare(strict_types=1);

namespace App\Libraries;

/**
 * Shared JSON shape for a user referenced by FlightMeet resources
 * (meet participants, group members, chat authors, creators).
 */
final class Participant
{
    /**
     * @param array $user Row with id, username, vorname, nachname.
     *
     * @return array{id: int, username: string, name: string}
     *         name = "Vorname Nachname", falling back to the username.
     */
    public static function format(array $user): array
    {
        $name = trim(($user['vorname'] ?? '') . ' ' . ($user['nachname'] ?? ''));

        return [
            'id'       => (int) $user['id'],
            'username' => (string) $user['username'],
            'name'     => $name !== '' ? $name : (string) $user['username'],
        ];
    }
}
