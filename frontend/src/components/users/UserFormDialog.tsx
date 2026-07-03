import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/NativeSelect'
import { api, ApiError } from '@/lib/api'
import { GROUPS, GROUP_LABELS } from '@/lib/types'
import type { UserRow } from '@/lib/types'
import { useAuth } from '@/lib/auth'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = neuen Benutzer anlegen */
  user: UserRow | null
  onSaved: () => void
}

interface FormState {
  username: string
  email: string
  password: string
  group: string
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

  // Formular beim Öffnen (re-)initialisieren — "adjust state during render",
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
        setGeneralError(err instanceof ApiError ? err.message : 'Speichern fehlgeschlagen.')
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
    <div className="space-y-1.5">
      <Label htmlFor={`uf-${key}`}>{label}</Label>
      <Input
        id={`uf-${key}`}
        value={String(form[key] ?? '')}
        onChange={(e) => set(key, e.target.value as FormState[typeof key])}
        aria-invalid={errors[key] ? true : undefined}
        {...inputProps}
      />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Benutzer bearbeiten: ${user.username}` : 'Neuer Benutzer'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Leeres Passwort-Feld = Passwort bleibt unverändert.'
              : 'Alle Pflichtfelder ausfüllen, um einen Benutzer anzulegen.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field('username', 'Benutzername *')}
            {field('email', 'E-Mail *', { type: 'email' })}
            {field('password', isEdit ? 'Neues Passwort' : 'Passwort *', {
              type: 'password',
              autoComplete: 'new-password',
              placeholder: isEdit ? 'unverändert' : 'mind. 8 Zeichen',
            })}
            <div className="space-y-1.5">
              <Label htmlFor="uf-group">Gruppe</Label>
              <NativeSelect
                id="uf-group"
                className="w-full"
                value={form.group}
                onChange={(e) => set('group', e.target.value)}
                disabled={isSelf}
                title={isSelf ? 'Eigene Gruppe kann nicht geändert werden' : undefined}
              >
                {GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {GROUP_LABELS[g]}
                  </option>
                ))}
              </NativeSelect>
              {errors.group && <p className="text-xs text-destructive">{errors.group}</p>}
            </div>
            {field('vorname', 'Vorname')}
            {field('nachname', 'Nachname')}
            {field('strasse', 'Straße')}
            {field('plz', 'PLZ')}
            {field('ort', 'Ort')}
            {isEdit && (
              <div className="flex items-end gap-2 pb-1">
                <Checkbox
                  id="uf-active"
                  checked={form.active}
                  onCheckedChange={(checked) => set('active', checked === true)}
                  disabled={isSelf}
                />
                <Label htmlFor="uf-active" className="font-normal">
                  Aktiv
                </Label>
              </div>
            )}
          </div>

          {generalError && (
            <p role="alert" className="text-sm text-destructive">
              {generalError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichern…' : isEdit ? 'Speichern' : 'Anlegen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
