<?php

declare(strict_types=1);

namespace Tests\Api;

use Tests\Support\ApiTestCase;

/**
 * Feature tests for /api/meets (list, detail, create, update, join/leave).
 *
 * @internal
 */
final class MeetsApiTest extends ApiTestCase
{
    public function testIndexReturnsMeetsWithDerivedCountAndStatus(): void
    {
        $owner  = $this->createPilot('owner');
        $meetId = $this->insertMeet($owner, ['max_participants' => 2]);
        $this->joinMeet($meetId, $this->createPilot('pilot2'));
        $this->joinMeet($meetId, $this->createPilot('pilot3'));

        $response = $this->get('api/meets');
        $response->assertStatus(200);

        $data = $this->json($response)['data'];
        $this->assertCount(1, $data);
        $this->assertSame(2, $data[0]['participantCount']);
        $this->assertSame('full', $data[0]['status']);
        $this->assertFalse($data[0]['joined'], 'a guest has joined nothing');
        $this->assertSame('10:00', $data[0]['time']);
    }

    public function testIndexMarksMeetsTheCurrentUserJoined(): void
    {
        $owner = $this->createPilot('owner');
        $pilot = $this->createPilot('pilot');
        $mine  = $this->insertMeet($owner, ['title' => 'Joined one']);
        $this->insertMeet($owner, ['title' => 'Other one']);
        $this->joinMeet($mine, $pilot);

        $data = $this->json($this->actingAs($pilot)->get('api/meets'))['data'];

        $byTitle = array_column($data, 'joined', 'title');
        $this->assertTrue($byTitle['Joined one']);
        $this->assertFalse($byTitle['Other one']);
    }

    public function testShowReturnsDetailWithParticipantsAndCreator(): void
    {
        $owner  = $this->createPilot('owner');
        $pilot  = $this->createPilot('pilot');
        $meetId = $this->insertMeet($owner, ['latitude' => 48.06, 'longitude' => 8.01]);
        $this->joinMeet($meetId, $pilot);

        $response = $this->get("api/meets/{$meetId}");
        $response->assertStatus(200);

        $meet = $this->json($response)['meet'];
        $this->assertSame('owner', $meet['createdBy']['username']);
        $this->assertSame(['pilot'], array_column($meet['participants'], 'username'));
        $this->assertEqualsWithDelta(48.06, $meet['latitude'], 0.0001);
        $this->assertSame(1, $meet['participantCount']);
    }

    public function testShowUnknownMeetIs404(): void
    {
        $this->get('api/meets/999')->assertStatus(404);
    }

    public function testCreateRequiresASession(): void
    {
        $this->withBodyFormat('json')
            ->post('api/meets', $this->meetPayload())
            ->assertStatus(401);
    }

    public function testCreateValidatesTheBody(): void
    {
        $pilot = $this->createPilot('pilot');

        $response = $this->actingAs($pilot)
            ->withBodyFormat('json')
            ->post('api/meets', ['title' => 'Only a title']);

        $response->assertStatus(422);
        $errors = $this->json($response)['errors'];
        $this->assertArrayHasKey('spot', $errors);
        $this->assertArrayHasKey('date', $errors);
    }

    public function testCreateRejectsAPastDate(): void
    {
        $pilot = $this->createPilot('pilot');

        $response = $this->actingAs($pilot)
            ->withBodyFormat('json')
            ->post('api/meets', $this->meetPayload(['date' => '2020-01-01']));

        $response->assertStatus(422);
        $this->assertArrayHasKey('date', $this->json($response)['errors']);
    }

    public function testCreatePersistsTheMeetWithGivenCoordinates(): void
    {
        $pilot = $this->createPilot('pilot');

        $response = $this->actingAs($pilot)
            ->withBodyFormat('json')
            ->post('api/meets', $this->meetPayload());

        $response->assertStatus(201);
        $meet = $this->json($response)['meet'];
        $this->assertSame('Evening Session', $meet['title']);
        $this->assertSame('pilot', $meet['createdBy']['username']);
        $this->assertSame('open', $meet['status']);
        $this->assertEqualsWithDelta(47.8, $meet['latitude'], 0.0001);

        $this->seeInDatabase('meets', ['title' => 'Evening Session', 'created_by' => $pilot->id]);
    }

    public function testUpdateIsForbiddenForNonOwners(): void
    {
        $owner  = $this->createPilot('owner');
        $other  = $this->createPilot('other');
        $meetId = $this->insertMeet($owner);

        $this->actingAs($other)
            ->withBodyFormat('json')
            ->put("api/meets/{$meetId}", $this->meetPayload())
            ->assertStatus(403);
    }

    public function testOwnerCanUpdateAndAdminToo(): void
    {
        $owner  = $this->createPilot('owner');
        $admin  = $this->createPilot('boss', 'admin');
        $meetId = $this->insertMeet($owner);

        $response = $this->actingAs($owner)
            ->withBodyFormat('json')
            ->put("api/meets/{$meetId}", $this->meetPayload(['title' => 'Renamed by owner']));
        $response->assertStatus(200);
        $this->assertSame('Renamed by owner', $this->json($response)['meet']['title']);

        $response = $this->actingAs($admin)
            ->withBodyFormat('json')
            ->put("api/meets/{$meetId}", $this->meetPayload(['title' => 'Renamed by admin']));
        $response->assertStatus(200);
        $this->assertSame('Renamed by admin', $this->json($response)['meet']['title']);
    }

    public function testUpdateCannotShrinkBelowCurrentParticipants(): void
    {
        $owner  = $this->createPilot('owner');
        $meetId = $this->insertMeet($owner, ['max_participants' => 5]);
        $this->joinMeet($meetId, $this->createPilot('pilot1'));
        $this->joinMeet($meetId, $this->createPilot('pilot2'));

        $response = $this->actingAs($owner)
            ->withBodyFormat('json')
            ->put("api/meets/{$meetId}", $this->meetPayload(['maxParticipants' => 1]));

        $response->assertStatus(422);
        $this->assertArrayHasKey('maxParticipants', $this->json($response)['errors']);
    }

    public function testUpdateKeepsAnUnchangedPastDate(): void
    {
        $owner  = $this->createPilot('owner');
        $meetId = $this->insertMeet($owner, ['date' => '2026-01-10']);

        $this->actingAs($owner)
            ->withBodyFormat('json')
            ->put("api/meets/{$meetId}", $this->meetPayload(['date' => '2026-01-10']))
            ->assertStatus(200);
    }

    public function testJoinAndLeaveRoundTrip(): void
    {
        $owner  = $this->createPilot('owner');
        $pilot  = $this->createPilot('pilot');
        $meetId = $this->insertMeet($owner);

        $response = $this->actingAs($pilot)->post("api/meets/{$meetId}/join");
        $response->assertStatus(200);
        $meet = $this->json($response)['meet'];
        $this->assertTrue($meet['joined']);
        $this->assertSame(1, $meet['participantCount']);

        // Joining twice conflicts.
        $this->actingAs($pilot)->post("api/meets/{$meetId}/join")->assertStatus(409);

        $response = $this->actingAs($pilot)->delete("api/meets/{$meetId}/join");
        $response->assertStatus(200);
        $this->assertSame(0, $this->json($response)['meet']['participantCount']);

        // Leaving without having joined conflicts.
        $this->actingAs($pilot)->delete("api/meets/{$meetId}/join")->assertStatus(409);
    }

    public function testJoinIsRejectedWhenTheMeetIsFull(): void
    {
        $owner  = $this->createPilot('owner');
        $late   = $this->createPilot('late');
        $meetId = $this->insertMeet($owner, ['max_participants' => 1]);
        $this->joinMeet($meetId, $this->createPilot('early'));

        $response = $this->actingAs($late)->post("api/meets/{$meetId}/join");
        $response->assertStatus(409);
        $this->assertSame('This meet is full.', $this->json($response)['error']);
    }

    public function testJoinRequiresASessionAndAnExistingMeet(): void
    {
        $this->post('api/meets/1/join')->assertStatus(401);

        $pilot = $this->createPilot('pilot');
        $this->actingAs($pilot)->post('api/meets/999/join')->assertStatus(404);
    }

    public function testWeatherConflictsWithoutCoordinates(): void
    {
        $owner  = $this->createPilot('owner');
        $meetId = $this->insertMeet($owner, ['latitude' => null, 'longitude' => null]);

        $response = $this->get("api/meets/{$meetId}/weather");
        $response->assertStatus(409);
        $this->assertSame('This meet has no coordinates.', $this->json($response)['error']);
    }
}
