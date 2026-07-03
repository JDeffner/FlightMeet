<?php

declare(strict_types=1);

namespace App\Controllers\Api\Admin;

use App\Controllers\Api\AuthController;
use App\Controllers\BaseController;
use CodeIgniter\Database\BaseBuilder;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Shield\Entities\User;

/**
 * Admin user management API.
 *
 * All routes are behind the `adminapi` filter (session + admin.access);
 * each action additionally checks its specific permission so the
 * permission matrix in Config\AuthGroups stays authoritative.
 */
class UsersController extends BaseController
{
    private const SORTABLE = [
        'id', 'username', 'vorname', 'nachname', 'plz', 'ort',
        'email', 'active', 'last_active', 'created_at',
    ];

    /**
     * GET /api/admin/users
     * Query params: page, perPage (max 100), search, group, active, sort, dir
     */
    public function index(): ResponseInterface
    {
        if ($error = $this->requirePermission('users.view')) {
            return $error;
        }

        $page    = max(1, (int) ($this->request->getGet('page') ?? 1));
        $perPage = min(100, max(1, (int) ($this->request->getGet('perPage') ?? 25)));
        $search  = trim((string) ($this->request->getGet('search') ?? ''));
        $group   = trim((string) ($this->request->getGet('group') ?? ''));
        $active  = $this->request->getGet('active'); // '', '1' or '0'
        $sort    = (string) ($this->request->getGet('sort') ?? 'id');
        $dir     = strtolower((string) ($this->request->getGet('dir') ?? 'asc')) === 'desc' ? 'DESC' : 'ASC';

        if (! in_array($sort, self::SORTABLE, true)) {
            $sort = 'id';
        }

        $total = (int) ($this->buildFilteredQuery($search, $group, $active)
            ->select('COUNT(DISTINCT u.id) AS cnt', false)
            ->get()
            ->getRow()
            ->cnt ?? 0);

        $sortColumn = $sort === 'email' ? 'i.secret' : 'u.' . $sort;

        $rows = $this->buildFilteredQuery($search, $group, $active)
            ->select(
                'u.id, u.username, u.vorname, u.nachname, u.strasse, u.plz, u.ort, u.active, '
                . 'u.last_active, u.created_at, i.secret AS email, '
                . "GROUP_CONCAT(g.`group` ORDER BY g.`group`) AS `groups`",
                false,
            )
            ->groupBy('u.id')
            ->orderBy($sortColumn, $dir)
            ->orderBy('u.id', 'ASC')
            ->limit($perPage, ($page - 1) * $perPage)
            ->get()
            ->getResultArray();

        $data = array_map(static function (array $row): array {
            $row['id']     = (int) $row['id'];
            $row['active'] = (bool) $row['active'];
            $row['groups'] = $row['groups'] === null ? [] : explode(',', $row['groups']);

            return $row;
        }, $rows);

        return $this->response->setJSON([
            'data'       => $data,
            'total'      => $total,
            'page'       => $page,
            'perPage'    => $perPage,
            'totalPages' => (int) ceil($total / $perPage),
        ]);
    }

    /**
     * GET /api/admin/users/{id}
     */
    public function show(int $id): ResponseInterface
    {
        if ($error = $this->requirePermission('users.view')) {
            return $error;
        }

        $user = auth()->getProvider()->findById($id);
        if ($user === null) {
            return $this->userNotFound();
        }

        return $this->response->setJSON(['user' => AuthController::formatUser($user)]);
    }

    /**
     * POST /api/admin/users
     */
    public function create(): ResponseInterface
    {
        if ($error = $this->requirePermission('users.create')) {
            return $error;
        }

        $data = $this->request->getJSON(true) ?? [];

        $validation = service('validation');
        $validation->setRules([
            'username' => 'required|min_length[3]|max_length[30]|regex_match[/\A[\p{L}\p{N}\.\-_\' ]+\z/u]|is_unique[users.username]',
            'email'    => 'required|max_length[254]|valid_email|is_unique[auth_identities.secret]',
            'password' => 'required|min_length[8]',
            'group'    => 'required|in_list[' . implode(',', $this->availableGroups()) . ']',
            'vorname'  => 'permit_empty|max_length[50]',
            'nachname' => 'permit_empty|max_length[50]',
            'strasse'  => 'permit_empty|max_length[100]',
            'plz'      => 'permit_empty|max_length[10]',
            'ort'      => 'permit_empty|max_length[100]',
        ]);

        if (! $validation->run($data)) {
            return $this->validationError($validation->getErrors());
        }

        $users = auth()->getProvider();

        $user = new User([
            'username' => $data['username'],
            'email'    => $data['email'],
            'password' => $data['password'],
            'vorname'  => $data['vorname'] ?? null,
            'nachname' => $data['nachname'] ?? null,
            'strasse'  => $data['strasse'] ?? null,
            'plz'      => $data['plz'] ?? null,
            'ort'      => $data['ort'] ?? null,
            'active'   => 1,
        ]);

        if (! $users->save($user)) {
            return $this->validationError($users->errors());
        }

        $user = $users->findById($users->getInsertID());
        $user->syncGroups($data['group']);

        return $this->response->setStatusCode(201)->setJSON([
            'user' => AuthController::formatUser($users->findById($user->id)),
        ]);
    }

    /**
     * PUT /api/admin/users/{id}
     */
    public function update(int $id): ResponseInterface
    {
        if ($error = $this->requirePermission('users.edit')) {
            return $error;
        }

        $users = auth()->getProvider();
        $user  = $users->findById($id);
        if ($user === null) {
            return $this->userNotFound();
        }

        $data   = $this->request->getJSON(true) ?? [];
        $isSelf = $id === auth()->id();

        $validation = service('validation');
        $validation->setRules([
            'username' => "permit_empty|min_length[3]|max_length[30]|regex_match[/\\A[\\p{L}\\p{N}\\.\\-_' ]+\\z/u]|is_unique[users.username,id,{$id}]",
            'email'    => "permit_empty|max_length[254]|valid_email|is_unique[auth_identities.secret,user_id,{$id}]",
            'password' => 'permit_empty|min_length[8]',
            'group'    => 'permit_empty|in_list[' . implode(',', $this->availableGroups()) . ']',
            'vorname'  => 'permit_empty|max_length[50]',
            'nachname' => 'permit_empty|max_length[50]',
            'strasse'  => 'permit_empty|max_length[100]',
            'plz'      => 'permit_empty|max_length[10]',
            'ort'      => 'permit_empty|max_length[100]',
        ]);

        if (! $validation->run($data)) {
            return $this->validationError($validation->getErrors());
        }

        // Admins may not lock themselves out.
        if ($isSelf) {
            if (array_key_exists('active', $data) && ! $data['active']) {
                return $this->response->setStatusCode(422)->setJSON([
                    'error' => 'You cannot deactivate your own account.',
                ]);
            }
            if (! empty($data['group']) && $data['group'] !== 'admin') {
                return $this->response->setStatusCode(422)->setJSON([
                    'error' => 'You cannot remove your own admin group.',
                ]);
            }
        }

        foreach (['username', 'vorname', 'nachname', 'strasse', 'plz', 'ort'] as $field) {
            if (array_key_exists($field, $data)) {
                $user->{$field} = $data[$field] !== '' ? $data[$field] : null;
            }
        }
        if (array_key_exists('active', $data)) {
            $user->active = (bool) $data['active'];
        }
        if (! empty($data['email']) && $data['email'] !== $user->email) {
            $user->email = $data['email'];
        }
        if (! empty($data['password'])) {
            $user->password = $data['password'];
        }

        if (! $users->save($user)) {
            return $this->validationError($users->errors());
        }

        if (! empty($data['group'])) {
            $user->syncGroups($data['group']);
        }

        return $this->response->setJSON([
            'user' => AuthController::formatUser($users->findById($id)),
        ]);
    }

    /**
     * DELETE /api/admin/users/{id}
     */
    public function delete(int $id): ResponseInterface
    {
        if ($error = $this->requirePermission('users.delete')) {
            return $error;
        }

        if ($id === auth()->id()) {
            return $this->response->setStatusCode(422)->setJSON([
                'error' => 'You cannot delete your own account.',
            ]);
        }

        $users = auth()->getProvider();
        if ($users->findById($id) === null) {
            return $this->userNotFound();
        }

        $users->delete($id); // soft delete (deleted_at)

        return $this->response->setJSON(['ok' => true]);
    }

    // --------------------------------------------------------------------

    private function buildFilteredQuery(string $search, string $group, mixed $active): BaseBuilder
    {
        $builder = db_connect()->table('users u')
            ->join('auth_identities i', "i.user_id = u.id AND i.type = 'email_password'", 'left')
            ->join('auth_groups_users g', 'g.user_id = u.id', 'left')
            ->where('u.deleted_at', null);

        if ($search !== '') {
            $builder->groupStart()
                ->like('u.username', $search)
                ->orLike('u.vorname', $search)
                ->orLike('u.nachname', $search)
                ->orLike('u.ort', $search)
                ->orLike('u.plz', $search)
                ->orLike('i.secret', $search)
                ->groupEnd();
        }

        if ($group !== '') {
            $builder->where('g.`group`', $group);
        }

        if ($active === '0' || $active === '1') {
            $builder->where('u.active', (int) $active);
        }

        return $builder;
    }

    /** @return list<string> */
    private function availableGroups(): array
    {
        return array_keys(config('AuthGroups')->groups);
    }

    private function requirePermission(string $permission): ?ResponseInterface
    {
        if (! auth()->user()->can($permission)) {
            return $this->response->setStatusCode(403)->setJSON([
                'error' => "Missing permission: {$permission}",
            ]);
        }

        return null;
    }

    private function userNotFound(): ResponseInterface
    {
        return $this->response->setStatusCode(404)->setJSON(['error' => 'User not found.']);
    }

    private function validationError(array $errors): ResponseInterface
    {
        return $this->response->setStatusCode(422)->setJSON(['errors' => $errors]);
    }
}
