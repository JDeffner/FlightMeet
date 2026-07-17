<?php

namespace App\Controllers;

use App\Libraries\OpenMeteo;
use CodeIgniter\HTTP\ResponseInterface;

class Weather extends BaseController
{
    private const DEFAULT_LOCATION = [
        'name'      => 'Frankfurt am Main',
        'country'   => 'Germany',
        'latitude'  => 50.1109,
        'longitude' => 8.6821,
    ];

    /** Cached reports live for 4 days; anything older is purged on touch. */
    private const MAX_AGE_DAYS = 4;

    /** A report is "stale" once its forecast is older than 6 hours. */
    private const STALE_AFTER_HOURS = 6;

    /**
     * GET /api/weather[?city=...]
     * Returns current conditions and a 7-day forecast as JSON.
     * Defaults to Frankfurt; ?city=... resolves another location
     * via the Open-Meteo geocoding API. A resolved city search whose
     * forecast fetch succeeds is cached in weather_reports.
     */
    public function index(): ResponseInterface
    {
        $city = trim((string) $this->request->getGet('city'));

        $openMeteo = new OpenMeteo();
        $location  = self::DEFAULT_LOCATION;
        $resolved  = false;

        if ($city !== '') {
            $match = $openMeteo->geocode($city);

            if ($match === null) {
                return $this->response->setStatusCode(404)->setJSON([
                    'status'  => 'error',
                    'message' => sprintf('Could not find "%s".', $city),
                ]);
            }

            $location = $match;
            $resolved = true;
        }

        $forecast = $openMeteo->forecast($location['latitude'], $location['longitude']);

        if ($forecast === null) {
            return $this->serviceUnavailable();
        }

        // Cache successful city searches keyed by coordinates.
        if ($resolved) {
            $this->cacheReport($location, $forecast);
        }

        return $this->response->setJSON([
            'status'   => 'ok',
            'location' => $location,
            'forecast' => $forecast,
        ]);
    }

    /**
     * GET /api/weather/reports — public.
     * Every cached report, newest fetch first. Purges >4-day rows first.
     */
    public function reports(): ResponseInterface
    {
        $this->purgeStale();

        $rows = db_connect()->table('weather_reports')
            ->orderBy('fetched_at', 'DESC')
            ->orderBy('id', 'DESC')
            ->get()
            ->getResultArray();

        return $this->response->setJSON([
            'data' => array_map([$this, 'formatReport'], $rows),
        ]);
    }

    /**
     * POST /api/weather/reports/{id}/refresh — public (CSRF applies).
     * Re-fetches from Open-Meteo, updates payload + fetched_at, and returns
     * the fresh single-report shape. 404 unknown id; 502 on upstream failure.
     */
    public function refresh(int $id): ResponseInterface
    {
        $this->purgeStale();

        $db  = db_connect();
        $row = $db->table('weather_reports')->where('id', $id)->get()->getRowArray();

        if ($row === null) {
            return $this->response->setStatusCode(404)->setJSON([
                'error' => 'Weather report not found.',
            ]);
        }

        $forecast = (new OpenMeteo())->forecast((float) $row['latitude'], (float) $row['longitude']);

        if ($forecast === null) {
            return $this->serviceUnavailable();
        }

        $fetchedAt = date('Y-m-d H:i:s');

        $db->table('weather_reports')->where('id', $id)->update([
            'payload'    => json_encode($this->payloadOf($forecast)),
            'fetched_at' => $fetchedAt,
        ]);

        $row['payload']    = json_encode($this->payloadOf($forecast));
        $row['fetched_at'] = $fetchedAt;

        return $this->response->setJSON([
            'report' => $this->formatReport($row),
        ]);
    }

    // --------------------------------------------------------------------

    /**
     * Upsert a report keyed by (latitude, longitude), then purge old rows.
     */
    private function cacheReport(array $location, array $forecast): void
    {
        $db = db_connect();

        $db->query(
            'INSERT INTO weather_reports (name, country, latitude, longitude, payload, fetched_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE name = VALUES(name), country = VALUES(country),
                 payload = VALUES(payload), fetched_at = VALUES(fetched_at)',
            [
                $location['name'],
                $location['country'],
                $location['latitude'],
                $location['longitude'],
                json_encode($this->payloadOf($forecast)),
                date('Y-m-d H:i:s'),
            ],
        );

        $this->purgeStale();
    }

    /** Delete cached reports older than MAX_AGE_DAYS. */
    private function purgeStale(): void
    {
        db_connect()->table('weather_reports')
            ->where('fetched_at <', date('Y-m-d H:i:s', strtotime('-' . self::MAX_AGE_DAYS . ' days')))
            ->delete();
    }

    /** The cached slice of an Open-Meteo forecast response. */
    private function payloadOf(array $forecast): array
    {
        return [
            'current'       => $forecast['current'] ?? null,
            'current_units' => $forecast['current_units'] ?? null,
            'daily'         => $forecast['daily'] ?? null,
            'daily_units'   => $forecast['daily_units'] ?? null,
        ];
    }

    /** JSON shape for a single cached report row. */
    private function formatReport(array $row): array
    {
        $fetchedTs = strtotime($row['fetched_at']);

        return [
            'id'        => (int) $row['id'],
            'name'      => $row['name'],
            'country'   => $row['country'],
            'latitude'  => (float) $row['latitude'],
            'longitude' => (float) $row['longitude'],
            'fetchedAt' => date(DATE_ATOM, $fetchedTs),
            'stale'     => $fetchedTs < strtotime('-' . self::STALE_AFTER_HOURS . ' hours'),
            'forecast'  => json_decode($row['payload'], true),
        ];
    }

    private function serviceUnavailable(): ResponseInterface
    {
        return $this->response->setStatusCode(502)->setJSON([
            'status'  => 'error',
            'message' => 'The weather service is currently unavailable. Please try again later.',
        ]);
    }
}
