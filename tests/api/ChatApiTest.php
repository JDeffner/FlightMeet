<?php

declare(strict_types=1);

namespace Tests\Api;

use CodeIgniter\Shield\Entities\User;
use Tests\Support\ApiTestCase;

/**
 * Feature tests for /api/chat/messages (global + group channels).
 *
 * @internal
 */
final class ChatApiTest extends ApiTestCase
{
    public function testChatRequiresASession(): void
    {
        $this->get('api/chat/messages')->assertStatus(401);
        $this->withBodyFormat('json')->post('api/chat/messages', ['body' => 'hi'])->assertStatus(401);
    }

    public function testGlobalChannelRoundTrip(): void
    {
        $pilot = $this->createPilot('pilot');
        $other = $this->createPilot('other');

        $response = $this->actingAs($pilot)
            ->withBodyFormat('json')
            ->post('api/chat/messages', ['body' => 'Anyone flying Kandel tomorrow?']);

        $response->assertStatus(201);
        $message = $this->json($response)['message'];
        $this->assertSame('Anyone flying Kandel tomorrow?', $message['body']);
        $this->assertTrue($message['mine']);
        $this->assertSame('pilot', $message['author']['username']);

        // The other pilot sees it in the global channel, not marked as theirs.
        $data = $this->json($this->actingAs($other)->get('api/chat/messages'))['data'];
        $this->assertCount(1, $data);
        $this->assertFalse($data[0]['mine']);
    }

    public function testMessageBodyIsValidated(): void
    {
        $pilot = $this->createPilot('pilot');

        $this->actingAs($pilot)
            ->withBodyFormat('json')
            ->post('api/chat/messages', ['body' => '   '])
            ->assertStatus(422);

        $this->actingAs($pilot)
            ->withBodyFormat('json')
            ->post('api/chat/messages', ['body' => str_repeat('x', 2001)])
            ->assertStatus(422);
    }

    public function testGroupChannelRequiresMembership(): void
    {
        $founder = $this->createPilot('founder');
        $outside = $this->createPilot('outside');
        $groupId = $this->insertGroup($founder);
        $this->joinGroup($groupId, $founder);

        // Unknown group → 404, non-member → 403, member → 200.
        $this->actingAs($outside)->get('api/chat/messages?groupId=999')->assertStatus(404);
        $this->actingAs($outside)->get("api/chat/messages?groupId={$groupId}")->assertStatus(403);
        $this->actingAs($outside)
            ->withBodyFormat('json')
            ->post('api/chat/messages', ['body' => 'hi', 'groupId' => $groupId])
            ->assertStatus(403);

        $response = $this->actingAs($founder)
            ->withBodyFormat('json')
            ->post('api/chat/messages', ['body' => 'Group only.', 'groupId' => $groupId]);
        $response->assertStatus(201);

        // Group messages stay out of the global channel.
        $global = $this->json($this->actingAs($founder)->get('api/chat/messages'))['data'];
        $this->assertCount(0, $global);

        $channel = $this->json(
            $this->actingAs($founder)->get("api/chat/messages?groupId={$groupId}"),
        )['data'];
        $this->assertSame(['Group only.'], array_column($channel, 'body'));
    }

    public function testAfterReturnsOnlyNewerMessages(): void
    {
        $pilot = $this->createPilot('pilot');

        $firstId = $this->postMessage($pilot, 'first');
        $this->postMessage($pilot, 'second');
        $this->postMessage($pilot, 'third');

        $data = $this->json(
            $this->actingAs($pilot)->get("api/chat/messages?after={$firstId}"),
        )['data'];

        $this->assertSame(['second', 'third'], array_column($data, 'body'));
    }

    public function testDeleteIsOwnMessageOrAdminOnly(): void
    {
        $author = $this->createPilot('author');
        $other  = $this->createPilot('other');
        $admin  = $this->createPilot('boss', 'admin');

        $ownId   = $this->postMessage($author, 'mine');
        $adminId = $this->postMessage($author, 'admin will take this one');

        $this->actingAs($other)->delete("api/chat/messages/{$ownId}")->assertStatus(403);
        $this->actingAs($author)->delete("api/chat/messages/{$ownId}")->assertStatus(200);
        $this->actingAs($admin)->delete("api/chat/messages/{$adminId}")->assertStatus(200);
        $this->actingAs($admin)->delete('api/chat/messages/999')->assertStatus(404);

        $this->dontSeeInDatabase('messages', ['id' => $ownId]);
    }

    /** Post a global-channel message and return its id. */
    private function postMessage(User $user, string $body): int
    {
        $response = $this->actingAs($user)
            ->withBodyFormat('json')
            ->post('api/chat/messages', ['body' => $body]);

        $response->assertStatus(201);

        return (int) $this->json($response)['message']['id'];
    }
}
