<?php

declare(strict_types=1);

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * FlightMeet domain tables: meets, meet participants, pilot groups,
 * group members, and chat messages.
 *
 * Chat channels: messages.group_id NULL = the global "All pilots" channel,
 * otherwise the chat of that group. Participant counts and meet status are
 * always derived from meet_participants (NFR-4), never stored.
 */
class CreateFlightMeetTables extends Migration
{
    public function up(): void
    {
        // --- meets -----------------------------------------------------
        $this->forge->addField([
            'id'               => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'title'            => ['type' => 'VARCHAR', 'constraint' => 120],
            'spot'             => ['type' => 'VARCHAR', 'constraint' => 120],
            'region'           => ['type' => 'VARCHAR', 'constraint' => 80],
            'date'             => ['type' => 'DATE'],
            'time'             => ['type' => 'TIME'],
            'description'      => ['type' => 'TEXT'],
            'level'            => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'All levels'],
            'max_participants' => ['type' => 'SMALLINT', 'unsigned' => true],
            'latitude'         => ['type' => 'DECIMAL', 'constraint' => '8,5', 'null' => true],
            'longitude'        => ['type' => 'DECIMAL', 'constraint' => '8,5', 'null' => true],
            'created_by'       => ['type' => 'INT', 'unsigned' => true],
            'created_at'       => ['type' => 'DATETIME', 'null' => true],
            'updated_at'       => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addKey('region');
        $this->forge->addForeignKey('created_by', 'users', 'id', '', 'CASCADE');
        $this->forge->createTable('meets');

        // --- meet_participants ------------------------------------------
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'meet_id'    => ['type' => 'INT', 'unsigned' => true],
            'user_id'    => ['type' => 'INT', 'unsigned' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addUniqueKey(['meet_id', 'user_id']);
        $this->forge->addForeignKey('meet_id', 'meets', 'id', '', 'CASCADE');
        $this->forge->addForeignKey('user_id', 'users', 'id', '', 'CASCADE');
        $this->forge->createTable('meet_participants');

        // --- flight_groups (pilot communities; not Shield auth groups) ---
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'name'        => ['type' => 'VARCHAR', 'constraint' => 80],
            'region'      => ['type' => 'VARCHAR', 'constraint' => 80],
            'description' => ['type' => 'TEXT'],
            'image'       => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'created_by'  => ['type' => 'INT', 'unsigned' => true],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addUniqueKey('name');
        $this->forge->addForeignKey('created_by', 'users', 'id', '', 'CASCADE');
        $this->forge->createTable('flight_groups');

        // --- group_members ------------------------------------------------
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'group_id'   => ['type' => 'INT', 'unsigned' => true],
            'user_id'    => ['type' => 'INT', 'unsigned' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addUniqueKey(['group_id', 'user_id']);
        $this->forge->addForeignKey('group_id', 'flight_groups', 'id', '', 'CASCADE');
        $this->forge->addForeignKey('user_id', 'users', 'id', '', 'CASCADE');
        $this->forge->createTable('group_members');

        // --- messages (group_id NULL = global channel) ---------------------
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'group_id'   => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'user_id'    => ['type' => 'INT', 'unsigned' => true],
            'body'       => ['type' => 'TEXT'],
            'created_at' => ['type' => 'DATETIME'],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addKey(['group_id', 'id']);
        $this->forge->addForeignKey('group_id', 'flight_groups', 'id', '', 'CASCADE');
        $this->forge->addForeignKey('user_id', 'users', 'id', '', 'CASCADE');
        $this->forge->createTable('messages');
    }

    public function down(): void
    {
        $this->forge->dropTable('messages');
        $this->forge->dropTable('group_members');
        $this->forge->dropTable('flight_groups');
        $this->forge->dropTable('meet_participants');
        $this->forge->dropTable('meets');
    }
}
