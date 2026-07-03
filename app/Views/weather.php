<?php
/**
 * Maps WMO weather codes (used by Open-Meteo) to a label and icon.
 * https://open-meteo.com/en/docs #weather_code documentation
 */
$weatherCodes = [
    0  => ['Clear sky', '☀️'],
    1  => ['Mainly clear', '🌤️'],
    2  => ['Partly cloudy', '⛅'],
    3  => ['Overcast', '☁️'],
    45 => ['Fog', '🌫️'],
    48 => ['Depositing rime fog', '🌫️'],
    51 => ['Light drizzle', '🌦️'],
    53 => ['Moderate drizzle', '🌦️'],
    55 => ['Dense drizzle', '🌧️'],
    56 => ['Light freezing drizzle', '🌧️'],
    57 => ['Dense freezing drizzle', '🌧️'],
    61 => ['Slight rain', '🌧️'],
    63 => ['Moderate rain', '🌧️'],
    65 => ['Heavy rain', '🌧️'],
    66 => ['Light freezing rain', '🌧️'],
    67 => ['Heavy freezing rain', '🌧️'],
    71 => ['Slight snowfall', '🌨️'],
    73 => ['Moderate snowfall', '🌨️'],
    75 => ['Heavy snowfall', '❄️'],
    77 => ['Snow grains', '❄️'],
    80 => ['Slight rain showers', '🌦️'],
    81 => ['Moderate rain showers', '🌧️'],
    82 => ['Violent rain showers', '⛈️'],
    85 => ['Slight snow showers', '🌨️'],
    86 => ['Heavy snow showers', '🌨️'],
    95 => ['Thunderstorm', '⛈️'],
    96 => ['Thunderstorm with slight hail', '⛈️'],
    99 => ['Thunderstorm with heavy hail', '⛈️'],
];

$describe = static fn (int $code): array => $weatherCodes[$code] ?? ['Unknown', '❓'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weather — <?= esc($location['name']) ?></title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(160deg, #1e3a5f 0%, #2c5f8a 55%, #3d7ab5 100%);
            color: #f0f4f8;
            min-height: 100vh;
            padding: 2rem 1rem;
        }
        .container { max-width: 720px; margin: 0 auto; }
        .search { display: flex; gap: .5rem; margin-bottom: 1.5rem; }
        .search input {
            flex: 1; padding: .65rem 1rem; border: none; border-radius: 8px;
            font-size: 1rem; background: rgba(255, 255, 255, .92); color: #1e3a5f;
        }
        .search button {
            padding: .65rem 1.25rem; border: none; border-radius: 8px;
            font-size: 1rem; font-weight: 600; cursor: pointer;
            background: #ffd166; color: #1e3a5f;
        }
        .search button:hover { background: #ffdd88; }
        .alert {
            background: rgba(214, 64, 69, .25); border: 1px solid rgba(214, 64, 69, .6);
            padding: .75rem 1rem; border-radius: 8px; margin-bottom: 1.5rem;
        }
        .card {
            background: rgba(255, 255, 255, .1); border: 1px solid rgba(255, 255, 255, .15);
            border-radius: 16px; padding: 2rem; margin-bottom: 1.5rem;
            backdrop-filter: blur(6px);
        }
        .location h1 { font-size: 1.6rem; font-weight: 600; }
        .location p { opacity: .75; font-size: .95rem; margin-top: .15rem; }
        .current { display: flex; align-items: center; gap: 1.5rem; margin-top: 1.25rem; flex-wrap: wrap; }
        .current .icon { font-size: 4.5rem; line-height: 1; }
        .current .temp { font-size: 3.5rem; font-weight: 700; }
        .current .desc { font-size: 1.15rem; opacity: .9; }
        .metrics {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: .75rem; margin-top: 1.5rem;
        }
        .metric {
            background: rgba(255, 255, 255, .08); border-radius: 10px;
            padding: .75rem 1rem;
        }
        .metric .label { font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; opacity: .65; }
        .metric .value { font-size: 1.25rem; font-weight: 600; margin-top: .2rem; }
        h2 { font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem; opacity: .9; }
        .forecast { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: .6rem; }
        .day {
            background: rgba(255, 255, 255, .08); border-radius: 10px;
            padding: .85rem .5rem; text-align: center;
        }
        .day .name { font-size: .85rem; font-weight: 600; }
        .day .icon { font-size: 1.8rem; margin: .4rem 0; }
        .day .hi { font-weight: 600; }
        .day .lo { opacity: .6; font-size: .9rem; }
        .day .rain { font-size: .75rem; opacity: .7; margin-top: .3rem; }
        footer { text-align: center; font-size: .8rem; opacity: .6; margin-top: 1rem; }
        footer a { color: inherit; }
    </style>
</head>
<body>
<div class="container">

    <form class="search" method="get" action="<?= site_url('weather') ?>">
        <input type="text" name="city" placeholder="Search for a city…" value="<?= esc($city, 'attr') ?>">
        <button type="submit">Search</button>
    </form>

    <?php if ($error !== null): ?>
        <div class="alert"><?= $error ?></div>
    <?php endif ?>

    <?php if ($forecast !== null): ?>
        <?php
        $current              = $forecast['current'];
        [$condLabel, $condIcon] = $describe((int) $current['weather_code']);
        $units                = $forecast['current_units'] ?? [];
        $tempUnit             = $units['temperature_2m'] ?? '°C';
        ?>
        <div class="card">
            <div class="location">
                <h1><?= esc($location['name']) ?><?= $location['country'] !== '' ? ', ' . esc($location['country']) : '' ?></h1>
                <p>Updated <?= esc(date('D, j M Y H:i', strtotime($current['time']))) ?> (local time)</p>
            </div>
            <div class="current">
                <span class="icon"><?= $condIcon ?></span>
                <span class="temp"><?= esc(round($current['temperature_2m'])) ?><?= esc($tempUnit) ?></span>
                <span class="desc"><?= esc($condLabel) ?></span>
            </div>
            <div class="metrics">
                <div class="metric">
                    <div class="label">Feels like</div>
                    <div class="value"><?= esc(round($current['apparent_temperature'])) ?><?= esc($tempUnit) ?></div>
                </div>
                <div class="metric">
                    <div class="label">Humidity</div>
                    <div class="value"><?= esc($current['relative_humidity_2m']) ?><?= esc($units['relative_humidity_2m'] ?? '%') ?></div>
                </div>
                <div class="metric">
                    <div class="label">Wind</div>
                    <div class="value"><?= esc($current['wind_speed_10m']) ?> <?= esc($units['wind_speed_10m'] ?? 'km/h') ?></div>
                </div>
                <div class="metric">
                    <div class="label">Precipitation</div>
                    <div class="value"><?= esc($current['precipitation']) ?> <?= esc($units['precipitation'] ?? 'mm') ?></div>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>7-day forecast</h2>
            <div class="forecast">
                <?php foreach ($forecast['daily']['time'] as $i => $date): ?>
                    <?php [, $dayIcon] = $describe((int) $forecast['daily']['weather_code'][$i]); ?>
                    <div class="day">
                        <div class="name"><?= $i === 0 ? 'Today' : esc(date('D', strtotime($date))) ?></div>
                        <div class="icon"><?= $dayIcon ?></div>
                        <div class="hi"><?= esc(round($forecast['daily']['temperature_2m_max'][$i])) ?>°</div>
                        <div class="lo"><?= esc(round($forecast['daily']['temperature_2m_min'][$i])) ?>°</div>
                        <?php if (isset($forecast['daily']['precipitation_probability_max'][$i])): ?>
                            <div class="rain">💧 <?= esc($forecast['daily']['precipitation_probability_max'][$i]) ?>%</div>
                        <?php endif ?>
                    </div>
                <?php endforeach ?>
            </div>
        </div>
    <?php endif ?>

    <footer>
        Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo.com</a>
    </footer>
</div>
</body>
</html>
