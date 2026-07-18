<?php

declare(strict_types=1);

namespace Tests\Support;

use CodeIgniter\Config\Factories;
use CodeIgniter\Shield\Entities\User;
use CodeIgniter\Shield\Test\AuthenticationTesting;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * Base class for JSON API feature tests.
 *
 * Runs every migration (App + Shield + Settings) against the in-memory
 * SQLite `tests` connection and provides small fixture helpers for users,
 * meets, and groups. Requests are made through FeatureTestTrait; log in
 * with Shield's actingAs().
 */
abstract class ApiTestCase extends CIUnitTestCase
{
    use AuthenticationTesting;
    use DatabaseTestTrait;
    use FeatureTestTrait;

    /** Run migrations from all namespaces, not just Tests\Support. */
    protected $namespace = null;

    protected $refresh = true;

    protected function setUp(): void
    {
        parent::setUp();

        // Shield's session login survives in the shared session service across
        // tests in the same process — log out so every test starts as a guest.
        $_SESSION = [];
        if (auth('session')->loggedIn()) {
            auth('session')->logout();
        }

        // The SPA sends the X-CSRF-TOKEN header with every mutating request;
        // feature tests exercise the controllers, not the CSRF handshake, so
        // drop the global csrf filter for the simulated requests.
        $filters                    = config('Filters');
        $filters->globals['before'] = array_values(array_filter(
            $filters->globals['before'],
            static fn ($alias): bool => $alias !== 'csrf',
        ));
        Factories::injectMock('config', 'Filters', $filters);
    }

    /** Create an active pilot in the given Shield group. */
    protected function createPilot(string $username = 'skyfox', string $group = 'user'): User
    {
        $users = auth()->getProvider();

        $user = new User([
            'username' => $username,
            'email'    => $username . '@example.com',
            'password' => 'Secret123!',
        ]);
        $users->save($user);

        $user = $users->findById($users->getInsertID());
        $user->addGroup($group);
        $user->activate();

        return $user;
    }

    /** Insert a meet row directly; returns its id. */
    protected function insertMeet(User $creator, array $overrides = []): int
    {
        $db  = db_connect();
        $now = date('Y-m-d H:i:s');

        $db->table('meets')->insert(array_merge([
            'title'            => 'Morning Soaring',
            'spot'             => 'Kandel West Launch',
            'region'           => 'Black Forest',
            'date'             => date('Y-m-d', strtotime('+7 days')),
            'time'             => '10:00:00',
            'description'      => 'Test meet.',
            'level'            => 'All levels',
            'max_participants' => 4,
            'latitude'         => null,
            'longitude'        => null,
            'created_by'       => $creator->id,
            'created_at'       => $now,
            'updated_at'       => $now,
        ], $overrides));

        return (int) $db->insertID();
    }

    /** Add a participant row to a meet. */
    protected function joinMeet(int $meetId, User $user): void
    {
        db_connect()->table('meet_participants')->insert([
            'meet_id'    => $meetId,
            'user_id'    => $user->id,
            'created_at' => date('Y-m-d H:i:s'),
        ]);
    }

    /** Insert a flight group; returns its id. */
    protected function insertGroup(User $creator, array $overrides = []): int
    {
        $db  = db_connect();
        $now = date('Y-m-d H:i:s');

        $db->table('flight_groups')->insert(array_merge([
            'name'        => 'Black Forest Crew',
            'region'      => 'Black Forest',
            'description' => 'Test group.',
            'image'       => null,
            'created_by'  => $creator->id,
            'created_at'  => $now,
            'updated_at'  => $now,
        ], $overrides));

        return (int) $db->insertID();
    }

    /** Add a membership row to a flight group. */
    protected function joinGroup(int $groupId, User $user): void
    {
        db_connect()->table('group_members')->insert([
            'group_id'   => $groupId,
            'user_id'    => $user->id,
            'created_at' => date('Y-m-d H:i:s'),
        ]);
    }

    /** Decode a JSON response body into an array. */
    protected function json(\CodeIgniter\Test\TestResponse $response): array
    {
        return json_decode($response->getJSON(), true);
    }

    /** A valid create/update payload for POST/PUT /api/meets. */
    protected function meetPayload(array $overrides = []): array
    {
        return array_merge([
            'title'           => 'Evening Session',
            'spot'            => 'Brauneck',
            'region'          => 'Bavarian Alps',
            'date'            => date('Y-m-d', strtotime('+14 days')),
            'time'            => '17:30',
            'description'     => 'Golden-hour soaring.',
            'level'           => 'Advanced',
            'maxParticipants' => 6,
            // Explicit coordinates so the controller never calls the
            // external Open-Meteo geocoder during tests.
            'latitude'        => 47.8,
            'longitude'       => 11.5,
        ], $overrides);
    }
}
