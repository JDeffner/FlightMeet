/** "2026-07-19" + "17:30" → "Sun, 19 Jul 2026 · 17:30". */
export function formatMeetDate(date: string, time: string): string {
  const d = new Date(`${date}T${time || '00:00'}`)
  if (Number.isNaN(d.getTime())) return `${date} · ${time}`
  const day = d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${day} · ${time}`
}
