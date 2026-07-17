import { useState } from 'react'
import type { FormEvent } from 'react'
import { WarningCircleIcon } from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
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
import { api, ApiError } from '@/lib/api'
import { GROUPS, GROUP_LABELS, TIERS, TIER_LABELS } from '@/lib/types'
import type { Tier, UserRow } from '@/lib/types'
import { useAuth } from '@/lib/auth'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = create a new user */
  user: UserRow | null
  onSaved: () => void
}

interface FormState {
  username: string
  email: string
  password: string
  group: string
  subscription_tier: Tier
  vorname: string
  nachname: string
  strasse: string
  plz: string
  ort: string
  active: boolean
}

const emptyForm: FormState = {
  username: '',
  email: '',
  password: '',
  group: 'user',
  subscription_tier: 'pilot',
  vorname: '',
  nachname: '',
  strasse: '',
  plz: '',
  ort: '',
  active: true,
}

export function UserFormDialog({ open, onOpenChange, user, onSaved }: Props) {
  const { user: currentUser } = useAuth()
  const isEdit = user !== null
  const isSelf = isEdit && currentUser?.id === user.id

  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // (Re-)initialize the form when the dialog opens — "adjust state during render",
  // siehe https://react.dev/learn/you-might-not-need-an-effect
  const openKey = open ? `open:${user?.id ?? 'new'}` : null
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null)
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey)
    if (openKey !== null) {
      setErrors({})
      setGeneralError(null)
      setForm(
        user
          ? {
              username: user.username ?? '',
              email: user.email ?? '',
              password: '',
              group: user.groups[0] ?? 'user',
              subscription_tier: user.subscription_tier ?? 'pilot',
              vorname: user.vorname ?? '',
              nachname: user.nachname ?? '',
              strasse: user.strasse ?? '',
              plz: user.plz ?? '',
              ort: user.ort ?? '',
              active: user.active,
            }
          : emptyForm,
      )
    }
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrors({})
    setGeneralError(null)
    setSaving(true)

    const payload: Record<string, unknown> = {
      username: form.username,
      email: form.email,
      group: form.group,
      subscription_tier: form.subscription_tier,
      vorname: form.vorname,
      nachname: form.nachname,
      strasse: form.strasse,
      plz: form.plz,
      ort: form.ort,
    }
    if (form.password !== '') payload.password = form.password
    if (isEdit) payload.active = form.active

    try {
      if (isEdit) {
        await api(`/api/admin/users/${user.id}`, { method: 'PUT', body: payload })
      } else {
        await api('/api/admin/users', { method: 'POST', body: payload })
      }
      onOpenChange(false)
      onSaved()
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

  const field = (
    key: keyof FormState & string,
    label: string,
    inputProps: Partial<React.ComponentProps<typeof Input>> = {},
  ) => (
    <Field data-invalid={errors[key] ? true : undefined}>
      <FieldLabel htmlFor={`uf-${key}`}>{label}</FieldLabel>
      <Input
        id={`uf-${key}`}
        value={String(form[key] ?? '')}
        onChange={(e) => set(key, e.target.value as FormState[typeof key])}
        aria-invalid={errors[key] ? true : undefined}
        {...inputProps}
      />
      <FieldError>{errors[key]}</FieldError>
    </Field>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit user: ${user.username}` : 'New user'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Leave the password field empty to keep the current password.'
              : 'Fill in all required fields to create a user.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {field('username', 'Username *')}
              {field('email', 'Email *', { type: 'email' })}
              {field('password', isEdit ? 'New password' : 'Password *', {
                type: 'password',
                autoComplete: 'new-password',
                placeholder: isEdit ? 'unchanged' : 'at least 8 characters',
              })}
              <Field data-invalid={errors.group ? true : undefined}>
                <FieldLabel htmlFor="uf-group">Group</FieldLabel>
                <Select
                  items={GROUPS.map((g) => ({ value: g, label: GROUP_LABELS[g] }))}
                  value={form.group}
                  onValueChange={(value) => set('group', value as string)}
                  disabled={isSelf}
                >
                  <SelectTrigger
                    id="uf-group"
                    className="w-full"
                    aria-invalid={errors.group ? true : undefined}
                    title={isSelf ? 'You cannot change your own group' : undefined}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {GROUPS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {GROUP_LABELS[g]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldError>{errors.group}</FieldError>
              </Field>
              <Field data-invalid={errors.subscription_tier ? true : undefined}>
                <FieldLabel htmlFor="uf-tier">Subscription plan</FieldLabel>
                <Select
                  items={TIERS.map((t) => ({ value: t, label: TIER_LABELS[t] }))}
                  value={form.subscription_tier}
                  onValueChange={(value) => set('subscription_tier', value as Tier)}
                >
                  <SelectTrigger
                    id="uf-tier"
                    className="w-full"
                    aria-invalid={errors.subscription_tier ? true : undefined}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {TIERS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TIER_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldError>{errors.subscription_tier}</FieldError>
              </Field>
              {field('vorname', 'First name')}
              {field('nachname', 'Last name')}
              {field('strasse', 'Street')}
              {field('plz', 'Postal code')}
              {field('ort', 'City')}
              {isEdit && (
                <Field orientation="horizontal" className="self-end pb-1">
                  <Checkbox
                    id="uf-active"
                    checked={form.active}
                    onCheckedChange={(checked) => set('active', checked === true)}
                    disabled={isSelf}
                  />
                  <FieldLabel htmlFor="uf-active" className="font-normal">
                    Active
                  </FieldLabel>
                </Field>
              )}
            </div>

            {generalError && (
              <Alert variant="destructive">
                <WarningCircleIcon />
                <AlertTitle>{generalError}</AlertTitle>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Spinner data-icon="inline-start" />}
                {isEdit ? 'Save changes' : 'Create user'}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
