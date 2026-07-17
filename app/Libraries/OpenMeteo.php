<?php

declare(strict_types=1);

namespace App\Libraries;

/**
 * Thin wrapper around the Open-Meteo geocoding and forecast APIs,
 * shared by the Weather controller and the meets weather endpoint.
 */
class OpenMeteo
{
    /**
     * Resolves a place name to coordinates via the geocoding API.
     *
     * @return array{name: string, country: string, latitude: float, longitude: float}|null
     *         null when the place is unresolvable or the service fails.
     */
    public function geocode(string $name): ?array
    {
        try {
            $response = service('openMeteoGeocoding')->get('v1/search', [
                'query' => [
                    'name'     => $name,
                    'count'    => 1,
                    'language' => 'en',
                    'format'   => 'json',
                ],
            ]);
        } catch (\Throwable $e) {
            log_message('error', 'Open-Meteo geocoding request failed: {message}', ['message' => $e->getMessage()]);

            return null;
        }

        if ($response->getStatusCode() !== 200) {
            return null;
        }

        $data  = json_decode($response->getBody(), true);
        $match = $data['results'][0] ?? null;

        if ($match === null) {
            return null;
        }

        return [
            'name'      => $match['name'],
            'country'   => $match['country'] ?? '',
            'latitude'  => (float) $match['latitude'],
            'longitude' => (float) $match['longitude'],
        ];
    }

    /**
     * Fetches current conditions and the daily forecast.
     *
     * @return array|null null when the weather service fails.
     */
    public function forecast(float $latitude, float $longitude): ?array
    {
        try {
            $response = service('openMeteo')->get('v1/forecast', [
                'query' => [
                    'latitude'  => $latitude,
                    'longitude' => $longitude,
                    'current'   => 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m',
                    'daily'     => 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant',
                    'timezone'  => 'auto',
                ],
            ]);
        } catch (\Throwable $e) {
            log_message('error', 'Open-Meteo forecast request failed: {message}', ['message' => $e->getMessage()]);

            return null;
        }

        if ($response->getStatusCode() !== 200) {
            log_message('error', 'Open-Meteo forecast returned HTTP {status}', ['status' => $response->getStatusCode()]);

            return null;
        }

        $data = json_decode($response->getBody(), true);

        if (! isset($data['current'], $data['daily'])) {
            return null;
        }

        return $data;
    }
}
