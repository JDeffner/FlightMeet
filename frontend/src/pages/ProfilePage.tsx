import { useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircleIcon, CheckIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { TIERS, TIER_LABELS } from '@/lib/types'
import type { Tier } from '@/lib/types'
import { cn } from '@/lib/utils'

// English plan copy (lib/types.ts still carries the original German TIER_INFO
// used elsewhere; spec NFR-9 requires an English UI).
const TIER_INFO_EN: Record<Tier, { price: string; tagline: string; features: string[] }> = {
  pilot: {
    price: '€0',
    tagline: 'free forever · for every licensed pilot',
    features: [
      'Join unlimited meets',
      'Meet chat + participant list',
      'Launch-site weather forecasts',
    ],
  },
  club: {
    price: '€19/month',
    tagline: 'per club · unlimited members',
    features: [
      'Club calendar + recurring meets',
      'Member roles and safety notes',
      'Season statistics export',
    ],
  },
  school: {
    price: '€49/month',
    tagline: 'per flight school · training features',
    features: [
      'Student progress tracking',
      'Meets with an instructor',
      'Radio checklist templates',
    ],
  },
}

interface FormState {
  username: string
  email: string
  password: string
  vorname: string
  nachname: string
  strasse: string
  plz: string
  ort: string
}

export function ProfilePage() {
  const { user, refresh } = useAuth()

  const [form, setForm] = useState<FormState>(() => ({
    username: user?.username ?? '',
    email: user?.email ?? '',
    password: '',
    vorname: user?.vorname ?? '',
    nachname: user?.nachname ?? '',
    strasse: user?.strasse ?? '',
    plz: user?.plz ?? '',
    ort: user?.ort ?? '',
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [tierError, setTierError] = useState<string | null>(null)
  const [switchingTo, setSwitchingTo] = useState<Tier | null>(null)

  if (!user) return null

  const set = <K extends keyof FormState>(key: K, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrors({})
    setGeneralError(null)
    setSaved(false)
    setSaving(true)

    const payload: Record<string, unknown> = {
      username: form.username,
      email: form.email,
      vorname: form.vorname,
      nachname: form.nachname,
      strasse: form.strasse,
      plz: form.plz,
      ort: form.ort,
    }
    if (form.password !== '') payload.password = form.password

    try {
      await api('/api/profile', { method: 'PUT', body: payload })
      await refresh()
      setForm((f) => ({ ...f, password: '' }))
      setSaved(true)
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setErrors(err.fieldErrors)
      } else {
        setGeneralError(err instanceof ApiError ? err.message : 'Saving failed.')
      }
    } finally {
      setSaving(false)
    }
  }

  const switchTier = async (tier: Tier) => {
    setTierError(null)
    setSwitchingTo(tier)
    try {
      await api('/api/profile/subscription', { method: 'PUT', body: { tier } })
      await refresh()
    } catch (err) {
      setTierError(err instanceof ApiError ? err.message : 'Switching plans failed.')
    } finally {
      setSwitchingTo(null)
    }
  }

  const field = (
    key: keyof FormState & string,
    label: string,
    inputProps: Partial<React.ComponentProps<typeof Input>> = {},
  ) => (
    <Field data-invalid={errors[key] ? true : undefined}>
      <FieldLabel htmlFor={`pf-${key}`}>{label}</FieldLabel>
      <Input
        id={`pf-${key}`}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        aria-invalid={errors[key] ? true : undefined}
        {...inputProps}
      />
      <FieldError>{errors[key]}</FieldError>
    </Field>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium">{user.username}</span> ({user.email})
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Personal details</CardTitle>
          <CardDescription>Leave the password field empty to keep your current password.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <FieldGroup className="gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {field('username', 'Username')}
                {field('email', 'Email', { type: 'email' })}
                {field('vorname', 'First name')}
                {field('nachname', 'Last name')}
                {field('strasse', 'Street')}
                {field('plz', 'Postal code')}
                {field('ort', 'City')}
                {field('password', 'New password', {
                  type: 'password',
                  autoComplete: 'new-password',
                  placeholder: 'unchanged',
                })}
              </div>
              {generalError && (
                <Alert variant="destructive">
                  <WarningCircleIcon />
                  <AlertTitle>{generalError}</AlertTitle>
                </Alert>
              )}
              {saved && (
                <Alert>
                  <CheckCircleIcon />
                  <AlertTitle>Profile saved.</AlertTitle>
                </Alert>
              )}
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={saving}>
              {saving && <Spinner data-icon="inline-start" />}
              Save changes
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Subscription</h2>
          <p className="text-sm text-muted-foreground">
            Current plan:{' '}
            <Badge variant="secondary">{TIER_LABELS[user.subscription_tier]}</Badge>
          </p>
        </div>

        {tierError && (
          <Alert variant="destructive">
            <WarningCircleIcon />
            <AlertTitle>{tierError}</AlertTitle>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {TIERS.map((tier) => {
            const info = TIER_INFO_EN[tier]
            const isCurrent = user.subscription_tier === tier
            return (
              <Card
                key={tier}
                className={cn('flex flex-col', isCurrent && 'border-primary ring-1 ring-primary')}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {TIER_LABELS[tier]}
                    {isCurrent && <Badge>Current</Badge>}
                  </CardTitle>
                  <CardDescription>
                    <span className="text-lg font-semibold text-foreground">{info.price}</span>
                    <br />
                    {info.tagline}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grow">
                  <ul className="space-y-2 text-sm">
                    {info.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isCurrent ? 'outline' : 'default'}
                    disabled={isCurrent || switchingTo !== null}
                    onClick={() => void switchTier(tier)}
                  >
                    {switchingTo === tier && <Spinner data-icon="inline-start" />}
                    {isCurrent ? 'Current plan' : `Switch to ${TIER_LABELS[tier]}`}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
