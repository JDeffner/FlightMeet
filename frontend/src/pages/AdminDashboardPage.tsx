import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import {
  CaretDoubleLeftIcon,
  CaretDoubleRightIcon,
  CaretDownIcon,
  CaretUpDownIcon,
  CaretUpIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
  WarningCircleIcon,
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
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { UserFormDialog } from '@/components/users/UserFormDialog'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { GROUPS, GROUP_LABELS, TIER_LABELS } from '@/lib/types'
import type { UserListResponse, UserRow } from '@/lib/types'

/** Pin the actions column to the right edge so it stays visible. */
const STICKY_ACTIONS = 'sticky right-0 bg-background'

export function AdminDashboardPage() {
  const { user: currentUser } = useAuth()

  // Server-side table parameters
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

  // Dialogs
  const [formOpen, setFormOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Debounce the search input
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
      setError(err instanceof ApiError ? err.message : 'Loading failed.')
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
      setDeleteError(err instanceof ApiError ? err.message : 'Deleting failed.')
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
        header: 'Username',
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
        header: 'Email',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
      },
      {
        id: 'ort',
        accessorFn: (row) => row.ort ?? '',
        header: 'Address',
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
        header: 'Group',
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
        accessorKey: 'subscription_tier',
        header: 'Plan',
        cell: ({ row }) => (
          <Badge variant={row.original.subscription_tier === 'pilot' ? 'outline' : 'secondary'}>
            {TIER_LABELS[row.original.subscription_tier] ?? row.original.subscription_tier}
          </Badge>
        ),
      },
      {
        accessorKey: 'active',
        header: 'Status',
        cell: ({ row }) =>
          row.original.active ? (
            <Badge variant="outline" className="text-green-700 dark:text-green-400">
              active
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              inactive
            </Badge>
          ),
      },
      {
        id: 'actions',
        header: () => <span className="block text-right">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const u = row.original
          const isSelf = currentUser?.id === u.id
          return (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${u.username}`}
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
                aria-label={`Delete ${u.username}`}
                disabled={isSelf}
                title={isSelf ? 'You cannot delete your own account' : undefined}
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
          <h1 className="text-2xl font-semibold">Admin dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString('en-GB')} users
          </p>
        </div>
        <Button
          onClick={() => {
            setEditUser(null)
            setFormOpen(true)
          }}
        >
          <PlusIcon />
          New user
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-64">
          <InputGroupInput
            placeholder="Search (name, email, city, postal code …)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <InputGroupAddon>
            <MagnifyingGlassIcon />
          </InputGroupAddon>
        </InputGroup>
        <Select
          items={[
            { value: '', label: 'All groups' },
            ...GROUPS.map((g) => ({ value: g, label: GROUP_LABELS[g] })),
          ]}
          value={group}
          onValueChange={(value) => {
            setGroup(value as string)
            setPage(1)
          }}
        >
          <SelectTrigger size="sm" aria-label="Filter by group">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">All groups</SelectItem>
              {GROUPS.map((g) => (
                <SelectItem key={g} value={g}>
                  {GROUP_LABELS[g]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          items={[
            { value: '', label: 'Any status' },
            { value: '1', label: 'active' },
            { value: '0', label: 'inactive' },
          ]}
          value={active}
          onValueChange={(value) => {
            setActive(value as string)
            setPage(1)
          }}
        >
          <SelectTrigger size="sm" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">Any status</SelectItem>
              <SelectItem value="1">active</SelectItem>
              <SelectItem value="0">inactive</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
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
            Reset filters
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <WarningCircleIcon />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}

      {/* Table */}
      <div className="rounded-3xl border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  return (
                    <TableHead
                      key={header.id}
                      className={header.column.id === 'actions' ? STICKY_ACTIONS : undefined}
                    >
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
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((_col, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length}>
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <UsersIcon />
                      </EmptyMedia>
                      <EmptyTitle>No users found</EmptyTitle>
                      <EmptyDescription>
                        Adjust the search or filters to find users.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className={loading ? 'opacity-50' : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cell.column.id === 'actions' ? STICKY_ACTIONS : undefined}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Rows per page</span>
          <Select
            value={String(perPage)}
            onValueChange={(value) => {
              setPerPage(Number(value))
              setPage(1)
            }}
          >
            <SelectTrigger size="sm" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {[10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            Page {page.toLocaleString('en-GB')} of {totalPages.toLocaleString('en-GB')}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="First page"
            disabled={page <= 1 || loading}
            onClick={() => setPage(1)}
          >
            <CaretDoubleLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Last page"
            disabled={page >= totalPages || loading}
            onClick={() => setPage(totalPages)}
          >
            <CaretDoubleRightIcon />
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
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{deleteUser?.username}</span> ({deleteUser?.email}) will be
              deleted. This action cannot be undone from the interface.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p role="alert" className="text-sm text-destructive">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={deleting} onClick={() => void confirmDelete()}>
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
