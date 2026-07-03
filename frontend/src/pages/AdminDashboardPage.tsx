import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import {
  CaretDownIcon,
  CaretUpDownIcon,
  CaretUpIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { NativeSelect } from '@/components/NativeSelect'
import { UserFormDialog } from '@/components/users/UserFormDialog'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { GROUPS, GROUP_LABELS } from '@/lib/types'
import type { UserListResponse, UserRow } from '@/lib/types'

export function AdminDashboardPage() {
  const { user: currentUser } = useAuth()

  // Server-seitige Tabellen-Parameter
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('')
  const [active, setActive] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'id', desc: false }])

  const [data, setData] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialoge
  const [formOpen, setFormOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Suche entprellen
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const sort = sorting[0] ?? { id: 'id', desc: false }
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(perPage),
      sort: sort.id,
      dir: sort.desc ? 'desc' : 'asc',
    })
    if (search) params.set('search', search)
    if (group) params.set('group', group)
    if (active) params.set('active', active)

    try {
      const res = await api<UserListResponse>(`/api/admin/users?${params}`)
      setData(res.data)
      setTotal(res.total)
      setTotalPages(Math.max(1, res.totalPages))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Laden fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }, [page, perPage, search, group, active, sorting])

  useEffect(() => {
    void load()
  }, [load])

  const confirmDelete = async () => {
    if (!deleteUser) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await api(`/api/admin/users/${deleteUser.id}`, { method: 'DELETE' })
      setDeleteUser(null)
      void load()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Löschen fehlgeschlagen.')
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo<ColumnDef<UserRow>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{row.original.id}</span>,
      },
      {
        accessorKey: 'username',
        header: 'Benutzername',
        cell: ({ row }) => <span className="font-medium">{row.original.username}</span>,
      },
      {
        id: 'nachname',
        accessorFn: (row) => row.nachname ?? '',
        header: 'Name',
        cell: ({ row }) =>
          row.original.vorname || row.original.nachname
            ? `${row.original.vorname ?? ''} ${row.original.nachname ?? ''}`.trim()
            : <span className="text-muted-foreground">—</span>,
      },
      {
        accessorKey: 'email',
        header: 'E-Mail',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
      },
      {
        id: 'ort',
        accessorFn: (row) => row.ort ?? '',
        header: 'Adresse',
        cell: ({ row }) => {
          const u = row.original
          if (!u.strasse && !u.ort) return <span className="text-muted-foreground">—</span>
          return (
            <div className="leading-tight">
              {u.strasse && <div>{u.strasse}</div>}
              <div className="text-muted-foreground">
                {[u.plz, u.ort].filter(Boolean).join(' ')}
              </div>
            </div>
          )
        },
      },
      {
        id: 'groups',
        header: 'Gruppe',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.groups.map((g) => (
              <Badge key={g} variant={g === 'admin' ? 'default' : 'secondary'}>
                {GROUP_LABELS[g] ?? g}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        accessorKey: 'active',
        header: 'Status',
        cell: ({ row }) =>
          row.original.active ? (
            <Badge variant="outline" className="text-green-700 dark:text-green-400">
              aktiv
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              inaktiv
            </Badge>
          ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const u = row.original
          const isSelf = currentUser?.id === u.id
          return (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${u.username} bearbeiten`}
                onClick={() => {
                  setEditUser(u)
                  setFormOpen(true)
                }}
              >
                <PencilSimpleIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${u.username} löschen`}
                disabled={isSelf}
                title={isSelf ? 'Eigenes Konto kann nicht gelöscht werden' : undefined}
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  setDeleteError(null)
                  setDeleteUser(u)
                }}
              >
                <TrashIcon />
              </Button>
            </div>
          )
        },
      },
    ],
    [currentUser?.id],
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    state: { sorting },
    onSortingChange: (updater) => {
      setSorting(updater)
      setPage(1)
    },
    enableSortingRemoval: false,
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Admin-Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString('de-DE')} Benutzer
          </p>
        </div>
        <Button
          onClick={() => {
            setEditUser(null)
            setFormOpen(true)
          }}
        >
          <PlusIcon />
          Neuer Benutzer
        </Button>
      </div>

      {/* Filter-Leiste */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="w-64 pl-7"
            placeholder="Suche (Name, E-Mail, Ort, PLZ …)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <NativeSelect
          value={group}
          onChange={(e) => {
            setGroup(e.target.value)
            setPage(1)
          }}
          aria-label="Nach Gruppe filtern"
        >
          <option value="">Alle Gruppen</option>
          {GROUPS.map((g) => (
            <option key={g} value={g}>
              {GROUP_LABELS[g]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          value={active}
          onChange={(e) => {
            setActive(e.target.value)
            setPage(1)
          }}
          aria-label="Nach Status filtern"
        >
          <option value="">Alle Status</option>
          <option value="1">aktiv</option>
          <option value="0">inaktiv</option>
        </NativeSelect>
        {(search || group || active) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput('')
              setGroup('')
              setActive('')
              setPage(1)
            }}
          >
            Filter zurücksetzen
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Tabelle */}
      <div className="rounded-none border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === 'asc' ? (
                            <CaretUpIcon className="size-3.5" />
                          ) : sorted === 'desc' ? (
                            <CaretDownIcon className="size-3.5" />
                          ) : (
                            <CaretUpDownIcon className="size-3.5 text-muted-foreground" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading && data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  Lade Benutzer…
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  Keine Benutzer gefunden.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className={loading ? 'opacity-50' : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginierung */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Zeilen pro Seite</span>
          <NativeSelect
            value={String(perPage)}
            onChange={(e) => {
              setPerPage(Number(e.target.value))
              setPage(1)
            }}
            aria-label="Zeilen pro Seite"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            Seite {page.toLocaleString('de-DE')} von {totalPages.toLocaleString('de-DE')}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage(1)}
          >
            «
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            Zurück
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Weiter
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage(totalPages)}
          >
            »
          </Button>
        </div>
      </div>

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editUser}
        onSaved={() => void load()}
      />

      <AlertDialog open={deleteUser !== null} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Benutzer löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{deleteUser?.username}</span> ({deleteUser?.email}) wird
              gelöscht. Diese Aktion kann nicht über die Oberfläche rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p role="alert" className="text-sm text-destructive">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={deleting} onClick={() => void confirmDelete()}>
              {deleting ? 'Löschen…' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
