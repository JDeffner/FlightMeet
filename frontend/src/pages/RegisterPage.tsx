import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { WarningCircleIcon } from '@phosphor-icons/react'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'

const KNOWN_FIELDS = ['username', 'email', 'password', 'vorname', 'nachname'] as const

export function RegisterPage() {
  const { user, loading, refresh } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [vorname, setVorname] = useState('')
  const [nachname, setNachname] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Already logged in? Registration is for guests only.
  if (!loading && user && !submitting) return <Navigate to="/meets" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    if (password !== confirm) {
      setFieldErrors({ confirm: 'The passwords don’t match. Please retype them.' })
      return
    }

    setSubmitting(true)
    try {
      await api('/api/auth/register', {
        method: 'POST',
        body: {
          username: username.trim(),
          email: email.trim(),
          password,
          ...(vorname.trim() ? { vorname: vorname.trim() } : {}),
          ...(nachname.trim() ? { nachname: nachname.trim() } : {}),
        },
      })
      // The backend logged the new session in — load it into auth state.
      await refresh()
      navigate('/meets', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        const known: Record<string, string> = {}
        const rest: string[] = []
        for (const [key, message] of Object.entries(err.fieldErrors)) {
          if ((KNOWN_FIELDS as readonly string[]).includes(key)) known[key] = message
          else rest.push(message)
        }
        setFieldErrors(known)
        if (rest.length > 0) setError(rest.join(' '))
      } else {
        setError(err instanceof ApiError ? err.message : 'Registration failed. Please try again.')
      }
      setSubmitting(false)
    }
  }

  const invalid = (key: string) => (fieldErrors[key] ? true : undefined)

  return (
    <div className="mx-auto max-w-md py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Join FlightMeet</CardTitle>
          <CardDescription>
            Create your free pilot account — meets, groups, and chat are waiting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup className="gap-5">
              <Field data-invalid={invalid('username')}>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="skyrider"
                  required
                  autoFocus
                  aria-invalid={invalid('username')}
                />
                {fieldErrors.username && <FieldError>{fieldErrors.username}</FieldError>}
              </Field>
              <Field data-invalid={invalid('email')}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pilot@example.com"
                  required
                  aria-invalid={invalid('email')}
                />
                {fieldErrors.email && <FieldError>{fieldErrors.email}</FieldError>}
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field data-invalid={invalid('vorname')}>
                  <FieldLabel htmlFor="vorname">First name</FieldLabel>
                  <Input
                    id="vorname"
                    autoComplete="given-name"
                    value={vorname}
                    onChange={(e) => setVorname(e.target.value)}
                    placeholder="Optional"
                    aria-invalid={invalid('vorname')}
                  />
                  {fieldErrors.vorname && <FieldError>{fieldErrors.vorname}</FieldError>}
                </Field>
                <Field data-invalid={invalid('nachname')}>
                  <FieldLabel htmlFor="nachname">Last name</FieldLabel>
                  <Input
                    id="nachname"
                    autoComplete="family-name"
                    value={nachname}
                    onChange={(e) => setNachname(e.target.value)}
                    placeholder="Optional"
                    aria-invalid={invalid('nachname')}
                  />
                  {fieldErrors.nachname && <FieldError>{fieldErrors.nachname}</FieldError>}
                </Field>
              </div>

              <Field data-invalid={invalid('password')}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-invalid={invalid('password')}
                />
                <FieldDescription>At least 8 characters.</FieldDescription>
                {fieldErrors.password && <FieldError>{fieldErrors.password}</FieldError>}
              </Field>
              <Field data-invalid={invalid('confirm')}>
                <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  aria-invalid={invalid('confirm')}
                />
                {fieldErrors.confirm && <FieldError>{fieldErrors.confirm}</FieldError>}
              </Field>

              {error && (
                <Alert variant="destructive">
                  <WarningCircleIcon />
                  <AlertTitle>{error}</AlertTitle>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Spinner data-icon="inline-start" />}
                Create account
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
