// Shared meet form for creating and editing meets (FR-17, FR-18, FR-19).
// Owns the form values, client-side validation and field rendering; the parent
// supplies onSubmit (which performs the API call) plus the labels and the
// Cancel destination. A map location picker keeps the lat/lng inputs and the
// marker two-way synced.
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CaretDownIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react'
import { ApiError } from '@/lib/api'
import { LEVELS, type MeetDetail } from '@/lib/types'
import { LocationPickerMap } from '@/components/map/LocationPickerMap'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

/** JSON body sent to POST /api/meets and PUT /api/meets/{id}. */
export interface MeetFormBody {
  title: string
  spot: string
  region: string
  date: string
  time: string
  level: string
  maxParticipants: number
  description: string
  latitude?: number
  longitude?: number
}

interface MeetFormProps {
  /** When present the form runs in edit mode: values are prefilled and the
   *  edit-only validation rules (capacity floor, past-date only when changed)
   *  apply. */
  initial?: MeetDetail
  submitLabel: string
  /** Where the Cancel button links to. */
  cancelTo: string
  /** Performs the API call. May throw ApiError; field/other errors are shown. */
  onSubmit: (body: MeetFormBody) => Promise<void>
}

interface FormValues {
  title: string
  spot: string
  region: string
  date: string
  time: string
  level: string
  maxParticipants: string
  description: string
  latitude: string
  longitude: string
}

const EMPTY: FormValues = {
  title: '',
  spot: '',
  region: '',
  date: '',
  time: '',
  level: '',
  maxParticipants: '',
  description: '',
  latitude: '',
  longitude: '',
}

function toFormValues(initial?: MeetDetail): FormValues {
  if (!initial) return EMPTY
  return {
    title: initial.title,
    spot: initial.spot,
    region: initial.region,
    date: initial.date,
    time: initial.time,
    level: initial.level,
    maxParticipants: String(initial.maxParticipants),
    description: initial.description,
    latitude: initial.latitude != null ? String(initial.latitude) : '',
    longitude: initial.longitude != null ? String(initial.longitude) : '',
  }
}

/** Today as YYYY-MM-DD in local time (for the date input's min and validation). */
function todayString(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** Round a coordinate to 5 decimals and drop trailing noise. */
function round5(n: number): string {
  return String(Math.round(n * 1e5) / 1e5)
}

function validate(values: FormValues, initial?: MeetDetail): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!values.title.trim()) errors.title = 'Give your meet a title.'
  if (!values.spot.trim()) errors.spot = 'Where do you launch? Name the flying spot.'
  if (!values.region.trim()) errors.region = 'Name the region so pilots can filter by it.'

  if (!values.date) {
    errors.date = 'Pick a date.'
  } else if (values.date < todayString() && (!initial || values.date !== initial.date)) {
    // On edit a past date is only a problem when the organizer changed it.
    errors.date = 'The date must not be in the past.'
  }

  if (!values.time) errors.time = 'Pick a start time.'
  if (!values.level) errors.level = 'Choose the experience level this meet is aimed at.'

  const max = Number(values.maxParticipants)
  if (!values.maxParticipants.trim() || !Number.isInteger(max) || max < 1) {
    errors.maxParticipants = 'Enter a whole number of at least 1.'
  } else if (initial && max < initial.participantCount) {
    errors.maxParticipants = `At least ${initial.participantCount}, since that many pilots have already joined.`
  }

  if (!values.description.trim()) errors.description = 'Tell pilots what to expect.'

  const hasLat = values.latitude.trim() !== ''
  const hasLng = values.longitude.trim() !== ''
  if (hasLat !== hasLng) {
    const key = hasLat ? 'longitude' : 'latitude'
    errors[key] = 'Provide both coordinates, or leave both empty for automatic geocoding.'
  }
  if (hasLat && (Number.isNaN(Number(values.latitude)) || Math.abs(Number(values.latitude)) > 90)) {
    errors.latitude = 'Latitude must be a number between -90 and 90.'
  }
  if (hasLng && (Number.isNaN(Number(values.longitude)) || Math.abs(Number(values.longitude)) > 180)) {
    errors.longitude = 'Longitude must be a number between -180 and 180.'
  }

  return errors
}

export function MeetForm({ initial, submitLabel, cancelTo, onSubmit }: MeetFormProps) {
  const [values, setValues] = useState<FormValues>(() => toFormValues(initial))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [showCoords, setShowCoords] = useState(initial?.latitude != null)
  const [submitting, setSubmitting] = useState(false)

  function clearErrors(...keys: string[]) {
    setErrors((prev) => {
      const next = { ...prev }
      for (const key of keys) delete next[key]
      return next
    })
  }

  function set<K extends keyof FormValues>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
    clearErrors(key)
  }

  const hasCoords = values.latitude.trim() !== '' || values.longitude.trim() !== ''

  // The marker position derives from the two number inputs, so typing valid
  // numbers moves the pin. A partial or invalid pair means no pin.
  const mapValue = useMemo(() => {
    if (values.latitude.trim() === '' || values.longitude.trim() === '') return null
    const lat = Number(values.latitude)
    const lng = Number(values.longitude)
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null
    return { lat, lng }
  }, [values.latitude, values.longitude])

  // A map click or marker drag fills the inputs, rounded to 5 decimals.
  function handleMapChange(v: { lat: number; lng: number }) {
    setValues((prev) => ({ ...prev, latitude: round5(v.lat), longitude: round5(v.lng) }))
    clearErrors('latitude', 'longitude')
  }

  function clearLocation() {
    setValues((prev) => ({ ...prev, latitude: '', longitude: '' }))
    clearErrors('latitude', 'longitude')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    const clientErrors = validate(values, initial)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) return

    const body: MeetFormBody = {
      title: values.title.trim(),
      spot: values.spot.trim(),
      region: values.region.trim(),
      date: values.date,
      time: values.time,
      level: values.level,
      maxParticipants: Number(values.maxParticipants),
      description: values.description.trim(),
    }
    if (values.latitude.trim() !== '') body.latitude = Number(values.latitude)
    if (values.longitude.trim() !== '') body.longitude = Number(values.longitude)

    setSubmitting(true)
    try {
      await onSubmit(body)
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setErrors(err.fieldErrors)
        setFormError('Please fix the highlighted fields.')
      } else if (err instanceof ApiError && err.status === 401) {
        setFormError('You need to be logged in for that. Your session may have expired.')
      } else {
        setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function fieldProps(key: keyof FormValues) {
    return {
      'data-invalid': errors[key] ? true : undefined,
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        {formError && (
          <Alert variant="destructive">
            <WarningCircleIcon />
            <AlertTitle>{formError}</AlertTitle>
          </Alert>
        )}

        <Field {...fieldProps('title')}>
          <FieldLabel htmlFor="meet-title">Title</FieldLabel>
          <Input
            id="meet-title"
            value={values.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Sunset soaring at the Kandel"
            aria-invalid={!!errors.title}
          />
          <FieldError>{errors.title}</FieldError>
        </Field>

        <div className="grid gap-7 sm:grid-cols-2 sm:gap-4">
          <Field {...fieldProps('spot')}>
            <FieldLabel htmlFor="meet-spot">Flying spot</FieldLabel>
            <Input
              id="meet-spot"
              value={values.spot}
              onChange={(e) => set('spot', e.target.value)}
              placeholder="Kandel"
              aria-invalid={!!errors.spot}
            />
            <FieldError>{errors.spot}</FieldError>
          </Field>
          <Field {...fieldProps('region')}>
            <FieldLabel htmlFor="meet-region">Region</FieldLabel>
            <Input
              id="meet-region"
              value={values.region}
              onChange={(e) => set('region', e.target.value)}
              placeholder="Black Forest"
              aria-invalid={!!errors.region}
            />
            <FieldError>{errors.region}</FieldError>
          </Field>
        </div>

        <div className="grid gap-7 sm:grid-cols-2 sm:gap-4">
          <Field {...fieldProps('date')}>
            <FieldLabel htmlFor="meet-date">Date</FieldLabel>
            <Input
              id="meet-date"
              type="date"
              min={todayString()}
              value={values.date}
              onChange={(e) => set('date', e.target.value)}
              aria-invalid={!!errors.date}
            />
            <FieldError>{errors.date}</FieldError>
          </Field>
          <Field {...fieldProps('time')}>
            <FieldLabel htmlFor="meet-time">Start time</FieldLabel>
            <Input
              id="meet-time"
              type="time"
              value={values.time}
              onChange={(e) => set('time', e.target.value)}
              aria-invalid={!!errors.time}
            />
            <FieldError>{errors.time}</FieldError>
          </Field>
        </div>

        <div className="grid gap-7 sm:grid-cols-2 sm:gap-4">
          <Field {...fieldProps('level')}>
            <FieldLabel htmlFor="meet-level">Experience level</FieldLabel>
            <Select
              items={LEVELS.map((l) => ({ value: l, label: l }))}
              value={values.level || null}
              onValueChange={(value) => set('level', (value as string) ?? '')}
            >
              <SelectTrigger id="meet-level" className="w-full" aria-invalid={!!errors.level}>
                <SelectValue placeholder="Select a level" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldError>{errors.level}</FieldError>
          </Field>
          <Field {...fieldProps('maxParticipants')}>
            <FieldLabel htmlFor="meet-max">Max participants</FieldLabel>
            <Input
              id="meet-max"
              type="number"
              min={1}
              step={1}
              value={values.maxParticipants}
              onChange={(e) => set('maxParticipants', e.target.value)}
              placeholder="10"
              aria-invalid={!!errors.maxParticipants}
            />
            <FieldError>{errors.maxParticipants}</FieldError>
          </Field>
        </div>

        <Field {...fieldProps('description')}>
          <FieldLabel htmlFor="meet-description">Description</FieldLabel>
          <Textarea
            id="meet-description"
            rows={4}
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Conditions, meeting point, planned route, what to bring…"
            aria-invalid={!!errors.description}
          />
          <FieldError>{errors.description}</FieldError>
        </Field>

        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setShowCoords((s) => !s)}
            className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            aria-expanded={showCoords}
          >
            <CaretDownIcon className={cn('transition-transform', !showCoords && '-rotate-90')} />
            Coordinates (optional)
          </button>
          {showCoords && (
            <div className="flex flex-col gap-4 rounded-2xl bg-muted/50 p-4">
              <LocationPickerMap
                value={mapValue}
                onChange={handleMapChange}
                center={[50.5, 9.5]}
                zoom={6}
                className="h-64 rounded-2xl"
              />
              <div className="grid gap-7 sm:grid-cols-2 sm:gap-4">
                <Field {...fieldProps('latitude')}>
                  <FieldLabel htmlFor="meet-lat">Latitude</FieldLabel>
                  <Input
                    id="meet-lat"
                    type="number"
                    step="any"
                    value={values.latitude}
                    onChange={(e) => set('latitude', e.target.value)}
                    placeholder="48.062"
                    aria-invalid={!!errors.latitude}
                  />
                  <FieldError>{errors.latitude}</FieldError>
                </Field>
                <Field {...fieldProps('longitude')}>
                  <FieldLabel htmlFor="meet-lng">Longitude</FieldLabel>
                  <Input
                    id="meet-lng"
                    type="number"
                    step="any"
                    value={values.longitude}
                    onChange={(e) => set('longitude', e.target.value)}
                    placeholder="8.011"
                    aria-invalid={!!errors.longitude}
                  />
                  <FieldError>{errors.longitude}</FieldError>
                </Field>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <FieldDescription className="max-w-md">
                  Click the map to drop a pin, or drag it to fine-tune. Leave this empty and we
                  geocode the flying spot automatically for the weather forecast.
                </FieldDescription>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearLocation}
                  disabled={!hasCoords}
                >
                  <XIcon data-icon="inline-start" />
                  Clear location
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting && <Spinner data-icon="inline-start" />}
            {submitLabel}
          </Button>
          <Button variant="ghost" nativeButton={false} render={<Link to={cancelTo} />}>
            Cancel
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
