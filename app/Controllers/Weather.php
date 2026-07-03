<?php

namespace App\Controllers;

class Weather extends BaseController
{
    private const DEFAULT_LOCATION = [
        'name'      => 'Frankfurt am Main',
        'country'   => 'Germany',
        'latitude'  => 50.1109,
        'longitude' => 8.6821,
    ];

    /**
     * GET /weather
     * Shows current conditions and a 7-day forecast.
     * Optional ?city=... query param searches another location,
     * otherwise Frankfurt is used.
     */
    public function index(): string
    {
        $city  = trim((string) $this->request->getGet('city'));
        $error = null;

        $location = self::DEFAULT_LOCATION;

        if ($city !== '') {
            $resolved = $this->resolveCity($city);

            if ($resolved !== null) {
                $location = $resolved;
            } else {
                $error = sprintf('Could not find "%s" — showing %s instead.', esc($city), self::DEFAULT_LOCATION['name']);
            }
        }

        $forecast = $this->fetchForecast($location['latitude'], $location['longitude']);

        if ($forecast === null) {
            $error = 'The weather service is currently unavailable. Please try again later.';
        }

        return view('weather', [
            'location' => $location,
            'forecast' => $forecast,
            'city'     => $city,
            'error'    => $error,
        ]);
    }

    /**
     * Resolves a city name to coordinates via the Open-Meteo geocoding API.
     */
    private function resolveCity(string $city): ?array
    {
        try {
            $response = service('openMeteoGeocoding')->get('v1/search', [
                'query' => [
                    'name'     => $city,
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
            'latitude'  => $match['latitude'],
            'longitude' => $match['longitude'],
        ];
    }

    /**
     * Fetches current conditions and the daily forecast from Open-Meteo.
     */
    private function fetchForecast(float $latitude, float $longitude): ?array
    {
        try {
            $response = service('openMeteo')->get('v1/forecast', [
                'query' => [
                    'latitude'  => $latitude,
                    'longitude' => $longitude,
                    'current'   => 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m',
                    'daily'     => 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
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
