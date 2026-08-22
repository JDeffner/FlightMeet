<?php

declare(strict_types=1);

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

/**
 * Imports the `personen` dataset (fwe.sql) into Shield's auth tables.
 *
 * Creates:
 *  - 1 admin      (admin / admin@team11.local)
 *  - 1 moderator  (moderator / moderator@team11.local)
 *  - 9999 regular users from `personen`, email <username-transliterated>@example.com
 *
 * No password is hardcoded. Each password is taken from the environment
 * (`seed.adminPassword`, `seed.moderatorPassword`, `seed.userPassword`) or,
 * when unset, generated randomly and printed once during the seed run.
 */
class PersonenSeeder extends Seeder
{
    public function run(): void
    {
        $now = date('Y-m-d H:i:s');

        if ($this->db->table('users')->countAllResults() > 0) {
            echo "users table is not empty — aborting so existing accounts are not duplicated.\n";
            echo "Empty the users, auth_identities and auth_groups_users tables to re-seed.\n";

            return;
        }

        // --- Known accounts for each permission level -------------------
        $this->createAccount('admin', 'admin@team11.local', $this->seedPassword('admin'), 'admin', $now);
        $this->createAccount('moderator', 'moderator@team11.local', $this->seedPassword('moderator'), 'moderator', $now);

        // --- Bulk import of personen ------------------------------------
        // One shared hash: hashing 10k passwords individually would take minutes.
        $sharedHash = password_hash($this->seedPassword('user'), PASSWORD_DEFAULT);

        $personen = $this->db->table('personen')
            ->select('id, vorname, name, strasse, plz, ort, username')
            ->orderBy('id', 'ASC')
            ->get()
            ->getResultArray();

        $userRows   = [];
        $usedEmails = [];

        foreach ($personen as $p) {
            $userRows[] = [
                'username'   => $p['username'],
                'vorname'    => $p['vorname'],
                'nachname'   => $p['name'],
                'strasse'    => $p['strasse'],
                'plz'        => $p['plz'],
                'ort'        => $p['ort'],
                'active'     => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        $this->db->table('users')->insertBatch($userRows, null, 500);

        // Map the generated user ids back via the (unique) usernames.
        $idByUsername = [];
        foreach ($this->db->table('users')->select('id, username')->get()->getResultArray() as $row) {
            $idByUsername[$row['username']] = (int) $row['id'];
        }

        $identityRows = [];
        $groupRows    = [];

        foreach ($personen as $p) {
            $userId = $idByUsername[$p['username']] ?? null;
            if ($userId === null) {
                continue;
            }

            $identityRows[] = [
                'user_id'    => $userId,
                'type'       => 'email_password',
                'secret'     => $this->uniqueEmail($p['username'], $usedEmails),
                'secret2'    => $sharedHash,
                'created_at' => $now,
                'updated_at' => $now,
            ];
            $groupRows[] = [
                'user_id'    => $userId,
                'group'      => 'user',
                'created_at' => $now,
            ];
        }

        $this->db->table('auth_identities')->insertBatch($identityRows, null, 500);
        $this->db->table('auth_groups_users')->insertBatch($groupRows, null, 500);

        echo sprintf("Seeded %d users (+ admin & moderator).\n", count($userRows));
    }

    /**
     * Resolves a seed password from the environment, or generates one and
     * prints it once. Nothing is written back to disk, so a password that is
     * not captured from this output cannot be recovered — reset it instead.
     */
    private function seedPassword(string $role): string
    {
        $fromEnv = (string) (env('seed.' . $role . 'Password') ?? '');

        if ($fromEnv !== '') {
            return $fromEnv;
        }

        $generated = bin2hex(random_bytes(12));

        echo sprintf(
            "Generated %s password: %s  (shown once — store it now, or set seed.%sPassword in .env)\n",
            $role,
            $generated,
            $role,
        );

        return $generated;
    }

    private function createAccount(string $username, string $email, string $password, string $group, string $now): void
    {
        $this->db->table('users')->insert([
            'username'   => $username,
            'active'     => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $userId = $this->db->insertID();

        $this->db->table('auth_identities')->insert([
            'user_id'    => $userId,
            'type'       => 'email_password',
            'secret'     => $email,
            'secret2'    => password_hash($password, PASSWORD_DEFAULT),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $this->db->table('auth_groups_users')->insert([
            'user_id'    => $userId,
            'group'      => $group,
            'created_at' => $now,
        ]);
    }

    /**
     * Builds an ASCII-safe, unique e-mail address from a username
     * (usernames contain umlauts/accents that don't belong in e-mails).
     *
     * @param array<string, bool> $used
     */
    private function uniqueEmail(string $username, array &$used): string
    {
        $local = mb_strtolower($username);

        if (class_exists(\Transliterator::class)) {
            $translit = \Transliterator::create('Any-Latin; Latin-ASCII');
            if ($translit !== null) {
                $local = $translit->transliterate($local) ?: $local;
            }
        }

        $local = preg_replace('/[^a-z0-9.]+/', '', $local) ?: 'user';

        $email   = $local . '@example.com';
        $counter = 1;
        while (isset($used[$email])) {
            $email = $local . $counter++ . '@example.com';
        }
        $used[$email] = true;

        return $email;
    }
}
