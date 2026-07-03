<?php

declare(strict_types=1);

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Extends Shield's `users` table with the profile fields
 * from the imported `personen` dataset.
 */
class AddProfileFieldsToUsers extends Migration
{
    public function up(): void
    {
        $this->forge->addColumn('users', [
            'vorname' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
                'null'       => true,
                'after'      => 'username',
            ],
            'nachname' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
                'null'       => true,
                'after'      => 'vorname',
            ],
            'strasse' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
                'null'       => true,
                'after'      => 'nachname',
            ],
            'plz' => [
                'type'       => 'VARCHAR',
                'constraint' => 10,
                'null'       => true,
                'after'      => 'strasse',
            ],
            'ort' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
                'null'       => true,
                'after'      => 'plz',
            ],
        ]);
    }

    public function down(): void
    {
        $this->forge->dropColumn('users', ['vorname', 'nachname', 'strasse', 'plz', 'ort']);
    }
}
