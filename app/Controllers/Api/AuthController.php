<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Shield\Entities\User;

class AuthController extends BaseController
{
    /**
     * GET /api/auth/me
     * Returns the current session state. Public — the SPA calls this on
     * startup to learn whether a user is logged in and to obtain the
     * CSRF token for subsequent mutating requests.
     */
    public function me(): ResponseInterface
    {
        $user = auth()->user();

        return $this->response->setJSON([
            'authenticated' => auth()->loggedIn(),
            'user'          => $user instanceof User ? self::formatUser($user) : null,
            'csrf'          => [
                'header' => csrf_header(),
                'token'  => csrf_hash(),
            ],
        ]);
    }

    /**
     * POST /api/auth/login
     * Body: { "login": "<email or username>", "password": "...", "remember": bool }
     */
    public function login(): ResponseInterface
    {
        $data     = $this->request->getJSON(true) ?? [];
        $login    = trim((string) ($data['login'] ?? ''));
        $password = (string) ($data['password'] ?? '');
        $remember = (bool) ($data['remember'] ?? false);

        if ($login === '' || $password === '') {
            return $this->response->setStatusCode(400)->setJSON([
                'error' => 'Login and password are required.',
            ]);
        }

        if (auth()->loggedIn()) {
            auth()->logout();
        }

        $credentials = [
            filter_var($login, FILTER_VALIDATE_EMAIL) ? 'email' : 'username' => $login,
            'password' => $password,
        ];

        /** @var \CodeIgniter\Shield\Authentication\Authenticators\Session $authenticator */
        $authenticator = auth('session')->getAuthenticator();
        $result        = $authenticator->remember($remember)->attempt($credentials);

        if (! $result->isOK()) {
            return $this->response->setStatusCode(401)->setJSON([
                'error' => $result->reason() ?? 'Invalid credentials.',
            ]);
        }

        return $this->response->setJSON([
            'user' => self::formatUser(auth()->user()),
            'csrf' => [
                'header' => csrf_header(),
                'token'  => csrf_hash(),
            ],
        ]);
    }

    /**
     * POST /api/auth/logout
     */
    public function logout(): ResponseInterface
    {
        if (auth()->loggedIn()) {
            auth()->logout();
        }

        return $this->response->setJSON(['ok' => true]);
    }

    /**
     * Shared JSON shape for a single user entity.
     */
    public static function formatUser(User $user): array
    {
        return [
            'id'          => $user->id,
            'username'    => $user->username,
            'email'       => $user->email,
            'vorname'     => $user->vorname,
            'nachname'    => $user->nachname,
            'strasse'     => $user->strasse,
            'plz'         => $user->plz,
            'ort'         => $user->ort,
            'active'      => (bool) $user->active,
            'groups'      => $user->getGroups(),
            'permissions' => [
                'admin.access' => $user->can('admin.access'),
                'users.view'   => $user->can('users.view'),
                'users.create' => $user->can('users.create'),
                'users.edit'   => $user->can('users.edit'),
                'users.delete' => $user->can('users.delete'),
            ],
            'last_active' => $user->last_active?->format('Y-m-d H:i:s'),
            'created_at'  => $user->created_at?->format('Y-m-d H:i:s'),
        ];
    }
}
