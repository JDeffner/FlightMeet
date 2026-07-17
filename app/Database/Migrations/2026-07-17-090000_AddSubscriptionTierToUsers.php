<?php

declare(strict_types=1);

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds the FlightMeet membership tier (pilot / club / school) to users.
 * Every existing account defaults to the free "pilot" tier.
 */
class AddSubscriptionTierToUsers extends Migration
{
    public function up(): void
    {
        $this->forge->addColumn('users', [
            'subscription_tier' => [
                'type'       => 'VARCHAR',
                'constraint' => 20,
                'null'       => false,
                'default'    => 'pilot',
                'after'      => 'ort',
            ],
        ]);
    }

    public function down(): void
    {
        $this->forge->dropColumn('users', 'subscription_tier');
    }
}
