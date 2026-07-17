<?php

declare(strict_types=1);

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Cached Open-Meteo forecasts, keyed by coordinates.
 *
 * A row is upserted whenever a city weather search resolves; the SPA landing
 * page reads them back via GET /api/weather/reports. The JSON forecast payload
 * ({current, current_units, daily, daily_units}) is stored verbatim so cached
 * reports render without a fresh upstream call. Rows older than 4 days are
 * purged whenever the table is touched.
 */
class CreateWeatherReportsTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'name'       => ['type' => 'VARCHAR', 'constraint' => 120],
            'country'    => ['type' => 'VARCHAR', 'constraint' => 80],
            'latitude'   => ['type' => 'DECIMAL', 'constraint' => '8,5'],
            'longitude'  => ['type' => 'DECIMAL', 'constraint' => '8,5'],
            'payload'    => ['type' => 'TEXT'],
            'fetched_at' => ['type' => 'DATETIME'],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addUniqueKey(['latitude', 'longitude']);
        $this->forge->createTable('weather_reports');
    }

    public function down(): void
    {
        $this->forge->dropTable('weather_reports');
    }
}
