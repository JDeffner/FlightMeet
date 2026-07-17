// 7-day forecast. Each day shows the condition, temps, rain chance and, with
// equal billing, the wind: max speed, max gusts and dominant direction.
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Forecast } from './types'
import { weatherIcon, weatherLabel } from './wmo'
import { compassPoint } from './wind'
import { WindArrow } from './WindArrow'

export function ForecastStrip({ forecast }: { forecast: Forecast }) {
  const { daily } = forecast
  const units = forecast.daily_units ?? {}
  const windUnit = units.wind_speed_10m_max ?? 'km/h'

  return (
    <Card>
      <CardHeader>
        <CardTitle>7-day outlook</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {daily.time.map((date, i) => {
            const rain = daily.precipitation_probability_max[i]
            const direction = daily.wind_direction_10m_dominant[i]
            return (
              <div
                key={date}
                title={weatherLabel(daily.weather_code[i])}
                className="flex flex-col items-center gap-1.5 rounded-2xl bg-muted/50 px-2 py-3 text-center"
              >
                <div className="text-xs font-semibold tracking-wide uppercase">
                  {i === 0
                    ? 'Today'
                    : new Date(date).toLocaleDateString('en-GB', { weekday: 'short' })}
                </div>
                <div className="text-2xl leading-none">
                  {weatherIcon(daily.weather_code[i])}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-semibold">
                    {Math.round(daily.temperature_2m_max[i])}°
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(daily.temperature_2m_min[i])}°
                  </span>
                </div>

                {/* Wind block, styled to match the temperature line's weight. */}
                <div className="mt-0.5 flex w-full flex-col items-center gap-0.5 rounded-xl bg-primary/10 px-1.5 py-1.5 ring-1 ring-primary/20">
                  <span className="flex items-center gap-1 text-sm font-semibold">
                    <WindArrow direction={direction} className="size-3.5 text-primary" />
                    {Math.round(daily.wind_speed_10m_max[i])}
                    <span className="text-[10px] font-normal text-muted-foreground">
                      {windUnit}
                    </span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    gusts {Math.round(daily.wind_gusts_10m_max[i])} · {compassPoint(direction)}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground">
                  💧 {rain ?? 0}%
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
