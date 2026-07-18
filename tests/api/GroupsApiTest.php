<?php

declare(strict_types=1);

namespace Tests\Api;

use Tests\Support\ApiTestCase;

/**
 * Feature tests for /api/groups (list, detail, create, update, join/leave).
 *
 * @internal
 */
final class GroupsApiTest extends ApiTestCase
{
    public function testIndexReturnsGroupsWithDerivedMemberCount(): void
    {
        $founder = $this->createPilot('founder');
        $groupId = $this->insertGroup($founder);
        $this->joinGroup($groupId, $founder);
        $this->joinGroup($groupId, $this->createPilot('member'));

        $response = $this->get('api/groups');
        $response->assertStatus(200);

        $data = $this->json($response)['data'];
        $this->assertCount(1, $data);
        $this->assertSame(2, $data[0]['memberCount']);
        $this->assertFalse($data[0]['joined']);
    }

    public function testShowReturnsMembersAndCreator(): void
    {
        $founder = $this->createPilot('founder');
        $groupId = $this->insertGroup($founder);
        $this->joinGroup($groupId, $founder);

        $group = $this->json($this->get("api/groups/{$groupId}"))['group'];
        $this->assertSame('founder', $group['createdBy']['username']);
        $this->assertSame(['founder'], array_column($group['members'], 'username'));

        $this->get('api/groups/999')->assertStatus(404);
    }

    public function testCreateRequiresSessionAndAutoJoinsTheFounder(): void
    {
        $payload = ['name' => 'Mosel Crew', 'region' => 'Mosel Valley', 'description' => 'Riverside soaring.'];

        $this->withBodyFormat('json')->post('api/groups', $payload)->assertStatus(401);

        $founder  = $this->createPilot('founder');
        $response = $this->actingAs($founder)->withBodyFormat('json')->post('api/groups', $payload);

        $response->assertStatus(201);
        $group = $this->json($response)['group'];
        $this->assertSame(1, $group['memberCount']);
        $this->assertTrue($group['joined'], 'the founder auto-joins');
    }

    public function testCreateRejectsADuplicateName(): void
    {
        $founder = $this->createPilot('founder');
        $this->insertGroup($founder, ['name' => 'Mosel Crew']);

        $response = $this->actingAs($founder)->withBodyFormat('json')->post('api/groups', [
            'name'        => 'Mosel Crew',
            'region'      => 'Mosel Valley',
            'description' => 'Duplicate.',
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('name', $this->json($response)['errors']);
    }

    public function testUpdateIsFounderOrAdminOnly(): void
    {
        $founder = $this->createPilot('founder');
        $other   = $this->createPilot('other');
        $admin   = $this->createPilot('boss', 'admin');
        $groupId = $this->insertGroup($founder);

        $payload = ['name' => 'Renamed', 'region' => 'Black Forest', 'description' => 'Updated.'];

        $this->actingAs($other)
            ->withBodyFormat('json')
            ->put("api/groups/{$groupId}", $payload)
            ->assertStatus(403);

        $response = $this->actingAs($admin)->withBodyFormat('json')->put("api/groups/{$groupId}", $payload);
        $response->assertStatus(200);
        $this->assertSame('Renamed', $this->json($response)['group']['name']);

        // The unique-name rule ignores the group itself on re-save.
        $this->actingAs($founder)
            ->withBodyFormat('json')
            ->put("api/groups/{$groupId}", $payload)
            ->assertStatus(200);
    }

    public function testJoinAndLeaveRoundTrip(): void
    {
        $founder = $this->createPilot('founder');
        $pilot   = $this->createPilot('pilot');
        $groupId = $this->insertGroup($founder);

        $response = $this->actingAs($pilot)->post("api/groups/{$groupId}/join");
        $response->assertStatus(200);
        $this->assertTrue($this->json($response)['group']['joined']);

        $this->actingAs($pilot)->post("api/groups/{$groupId}/join")->assertStatus(409);

        $response = $this->actingAs($pilot)->delete("api/groups/{$groupId}/join");
        $response->assertStatus(200);
        $this->assertSame(0, $this->json($response)['group']['memberCount']);

        $this->actingAs($pilot)->delete("api/groups/{$groupId}/join")->assertStatus(409);
        $this->actingAs($pilot)->post('api/groups/999/join')->assertStatus(404);
    }
}
