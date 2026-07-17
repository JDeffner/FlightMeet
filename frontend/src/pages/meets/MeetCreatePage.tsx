// Create a meet — FR-17, FR-18 (client-side validation), FR-19.
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import { api } from '@/lib/api'
import type { MeetDetail } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MeetForm, type MeetFormBody } from './MeetForm'

export function MeetCreatePage() {
  const navigate = useNavigate()

  async function onSubmit(body: MeetFormBody) {
    const res = await api<{ meet: MeetDetail }>('/api/meets', { method: 'POST', body })
    navigate(`/meets/${res.meet.id}`, { state: { created: true } })
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link to="/meets" />}>
          <ArrowLeftIcon data-icon="inline-start" />
          Back to meets
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Plan a flying meet</CardTitle>
          <CardDescription>
            Set the where and when — fellow pilots take care of the rest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MeetForm submitLabel="Create meet" cancelTo="/meets" onSubmit={onSubmit} />
        </CardContent>
      </Card>
    </div>
  )
}
