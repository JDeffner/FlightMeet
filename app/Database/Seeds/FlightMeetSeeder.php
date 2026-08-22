<?php

declare(strict_types=1);

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

/**
 * Sample FlightMeet content: test pilots, groups, upcoming meets with real
 * coordinates, participants, and chat messages (global + per group).
 *
 * Idempotent: aborts if meets already exist. Creates pilot1..pilot6 only when
 * those usernames are missing; their shared password comes from
 * `seed.pilotPassword` or is generated and printed once.
 */
class FlightMeetSeeder extends Seeder
{
    public function run(): void
    {
        if ($this->db->table('meets')->countAllResults() > 0) {
            echo "meets table is not empty — aborting.\n";

            return;
        }

        $now = date('Y-m-d H:i:s');

        // --- Test pilots -------------------------------------------------
        $pilots = [
            ['pilot1', 'Lena',   'Vogel',   'Freiburg'],
            ['pilot2', 'Jonas',  'Adler',   'Bad Tölz'],
            ['pilot3', 'Mara',   'Falk',    'Bernkastel-Kues'],
            ['pilot4', 'Timo',   'Storch',  'Garmisch'],
            ['pilot5', 'Aylin',  'Schwalbe','Trier'],
            ['pilot6', 'Erik',   'Habicht', 'Freiburg'],
        ];
        $pilotPassword = (string) (env('seed.pilotPassword') ?? '');

        if ($pilotPassword === '') {
            $pilotPassword = bin2hex(random_bytes(12));
            echo "Generated pilot1..pilot6 password: {$pilotPassword}  (shown once — store it now)\n";
        }

        $hash = password_hash($pilotPassword, PASSWORD_DEFAULT);
        $ids  = [];

        foreach ($pilots as [$username, $vorname, $nachname, $ort]) {
            $existing = $this->db->table('users')->select('id')->where('username', $username)->get()->getRowArray();
            if ($existing) {
                $ids[$username] = (int) $existing['id'];
                continue;
            }
            $this->db->table('users')->insert([
                'username' => $username, 'vorname' => $vorname, 'nachname' => $nachname,
                'ort' => $ort, 'active' => 1, 'created_at' => $now, 'updated_at' => $now,
            ]);
            $id = (int) $this->db->insertID();
            $ids[$username] = $id;
            $this->db->table('auth_identities')->insert([
                'user_id' => $id, 'type' => 'email_password',
                'secret'  => $username . '@example.com', 'secret2' => $hash,
                'created_at' => $now, 'updated_at' => $now,
            ]);
            $this->db->table('auth_groups_users')->insert([
                'user_id' => $id, 'group' => 'user', 'created_at' => $now,
            ]);
        }

        // --- Groups --------------------------------------------------------
        $groups = [
            ['Black Forest Soarers', 'Black Forest', "Ridge and thermal pilots around Kandel and Schauinsland. Weekend sessions, car shuttles, and a friendly débrief at the landing field.", 'pilot1'],
            ['Alpenvereinigung Süd', 'Bavarian Alps', "Cross-country and thermal flying between Brauneck and the Wank. We plan longer alpine days and share retrieve drives.", 'pilot2'],
            ['Mosel Valley Gliders', 'Mosel Valley', "After-work soaring above the vineyards. Beginner-friendly: we fly the Zeltingen ridge whenever the westerly works.", 'pilot3'],
            ['XC Beginners Welcome', 'All regions', "Learning cross-country together: route planning, airspace basics, and mentored first triangles. All wings welcome.", 'pilot5'],
        ];
        $groupIds = [];
        foreach ($groups as [$name, $region, $desc, $creator]) {
            $this->db->table('flight_groups')->insert([
                'name' => $name, 'region' => $region, 'description' => $desc,
                'created_by' => $ids[$creator], 'created_at' => $now, 'updated_at' => $now,
            ]);
            $groupIds[$name] = (int) $this->db->insertID();
        }

        $memberships = [
            ['Black Forest Soarers', ['pilot1', 'pilot4', 'pilot6']],
            ['Alpenvereinigung Süd', ['pilot2', 'pilot4']],
            ['Mosel Valley Gliders', ['pilot3', 'pilot5']],
            ['XC Beginners Welcome', ['pilot5', 'pilot1', 'pilot2', 'pilot3']],
        ];
        foreach ($memberships as [$group, $members]) {
            foreach ($members as $m) {
                $this->db->table('group_members')->insert([
                    'group_id' => $groupIds[$group], 'user_id' => $ids[$m], 'created_at' => $now,
                ]);
            }
        }

        // --- Meets (dates relative to today so they stay upcoming) ---------
        $meets = [
            ['Sunset Session at Kandel', 'Kandel West Launch', 'Black Forest', '+2 days', '17:30', 'Advanced', 10, 48.06246, 8.01158, 'pilot1',
                "Golden-hour soaring on the west ridge. Restitution usually kicks in around 6 pm — expect smooth lift along the treeline. Top-landing possible, main LZ is the Kandelhof meadow."],
            ['Thermal Day at Brauneck', 'Brauneck North', 'Bavarian Alps', '+3 days', '10:00', 'All levels', 12, 47.67799, 11.54221, 'pilot2',
                "Classic spring thermals over the Brauneck house ridge. Cable car from Lenggries, briefing at the summit station. XC pilots can push toward the Benediktenwand."],
            ['After-Work Soaring, Mosel', 'Zeltingen Ridge', 'Mosel Valley', '+6 days', '18:00', 'Beginner', 8, 49.96550, 7.00810, 'pilot3',
                "Relaxed evening ridge soaring above the vineyards. Ideal first ridge experience: wide launch, huge landing field by the river, instructors around."],
            ['Wank Cross-Country Clinic', 'Wank Summit Launch', 'Bavarian Alps', '+9 days', '11:00', 'Intermediate', 6, 47.51121, 11.14370, 'pilot4',
                "Guided XC day from the Wank: route briefing, airspace check, and a mentored task toward the Estergebirge. Radio required."],
            ['Schauinsland Morning Flow', 'Schauinsland Launch', 'Black Forest', '+12 days', '09:30', 'All levels', 15, 47.91170, 7.89960, 'pilot6',
                "Early laminar air before the valley wind wakes up. Big grassy launch, easy top-to-bottom for newer pilots, house thermal for everyone else."],
        ];
        $meetIds = [];
        foreach ($meets as [$title, $spot, $region, $offset, $time, $level, $max, $lat, $lng, $creator, $desc]) {
            $this->db->table('meets')->insert([
                'title' => $title, 'spot' => $spot, 'region' => $region,
                'date'  => date('Y-m-d', strtotime($offset)), 'time' => $time,
                'description' => $desc, 'level' => $level, 'max_participants' => $max,
                'latitude' => $lat, 'longitude' => $lng,
                'created_by' => $ids[$creator], 'created_at' => $now, 'updated_at' => $now,
            ]);
            $meetIds[$title] = (int) $this->db->insertID();
        }

        $participants = [
            ['Sunset Session at Kandel', ['pilot1', 'pilot4', 'pilot6']],
            ['Thermal Day at Brauneck', ['pilot2', 'pilot4', 'pilot5']],
            ['After-Work Soaring, Mosel', ['pilot3', 'pilot5']],
            ['Wank Cross-Country Clinic', ['pilot4', 'pilot2']],
            ['Schauinsland Morning Flow', ['pilot6']],
        ];
        foreach ($participants as [$meet, $names]) {
            foreach ($names as $n) {
                $this->db->table('meet_participants')->insert([
                    'meet_id' => $meetIds[$meet], 'user_id' => $ids[$n], 'created_at' => $now,
                ]);
            }
        }

        // --- Chat messages ---------------------------------------------------
        $messages = [
            [null, 'pilot2', 'Brauneck looks epic for Sunday — cloudbase forecast 2400m!', '-3 hours'],
            [null, 'pilot5', 'Anyone driving up from Trier? I can take two gliders.', '-2 hours'],
            [null, 'pilot1', 'Kandel west is on for Friday evening, wind should be perfect.', '-1 hours'],
            ['Black Forest Soarers', 'pilot1', 'Shuttle leaves the Kandelhof car park at 16:45 sharp.', '-5 hours'],
            ['Black Forest Soarers', 'pilot6', "I'll bring the wind meter and the flag for the LZ.", '-4 hours'],
            ['Mosel Valley Gliders', 'pilot3', 'Westerly is working again Wednesday — see you on the ridge!', '-6 hours'],
        ];
        foreach ($messages as [$group, $author, $body, $offset]) {
            $this->db->table('messages')->insert([
                'group_id'   => $group === null ? null : $groupIds[$group],
                'user_id'    => $ids[$author],
                'body'       => $body,
                'created_at' => date('Y-m-d H:i:s', strtotime($offset)),
            ]);
        }

        echo sprintf(
            "Seeded %d pilots, %d groups, %d meets, chat messages.\n",
            count($pilots),
            count($groups),
            count($meets),
        );
    }
}
