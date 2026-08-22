<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\UserModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Shield\Entities\User;

class AuthController extends BaseController
{
    /** Login attempts allowed per minute, per IP and per submitted identifier. */
    private const LOGIN_ATTEMPTS_PER_MINUTE = 5;

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

        // Rate limit before touching the authenticator: Shield throttles only
        // in its own LoginController, which this JSON API does not use.
        // Two buckets so one attacker cannot lock out a single account, and a
        // botnet cannot spray one account from many addresses.
        if (($retry = $this->throttleLogin($login)) !== null) {
            return $this->response->setStatusCode(429)
                ->setHeader('Retry-After', (string) $retry)
                ->setJSON(['error' => 'Too many login attempts. Please try again later.']);
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
     * Rate limits the login endpoint with CodeIgniter's throttler.
     * Returns the seconds the caller should wait, or null to proceed.
     */
    private function throttleLogin(string $login): ?int
    {
        $throttler = service('throttler');

        $buckets = [
            'login-ip-' . $this->request->getIPAddress(),
            'login-id-' . mb_strtolower($login),
        ];

        foreach ($buckets as $bucket) {
            if ($throttler->check(md5($bucket), self::LOGIN_ATTEMPTS_PER_MINUTE, MINUTE) === false) {
                return max(1, (int) ceil($throttler->getTokenTime()));
            }
        }

        return null;
    }

    /**
     * POST /api/auth/register
     * Body: { username, email, password, vorname?, nachname? }
     *
     * Guest-only self-registration. Creates a Shield account in group
     * `user` (every account is a pilot by default), logs the session in
     * and returns the same shape as login.
     */
    public function register(): ResponseInterface
    {
        if (auth()->loggedIn()) {
            return $this->response->setStatusCode(403)->setJSON([
                'error' => 'You are already logged in.',
            ]);
        }

        $data = $this->request->getJSON(true) ?? [];

        // Same rules as the admin create-user API, minus the group
        // choice: self-registration always lands in `user`.
        $rules = UserModel::createRules();
        unset($rules['group']);

        $validation = service('validation');
        $validation->setRules($rules);

        if (! $validation->run($data)) {
            return $this->response->setStatusCode(422)->setJSON([
                'errors' => $validation->getErrors(),
            ]);
        }

        $users = auth()->getProvider();

        $user = new User([
            'username' => $data['username'],
            'email'    => $data['email'],
            'password' => $data['password'],
            'vorname'  => $data['vorname'] ?? null,
            'nachname' => $data['nachname'] ?? null,
            'active'   => 1,
        ]);

        if (! $users->save($user)) {
            return $this->response->setStatusCode(422)->setJSON([
                'errors' => $users->errors(),
            ]);
        }

        $user = $users->findById($users->getInsertID());
        $user->syncGroups('user');

        /** @var \CodeIgniter\Shield\Authentication\Authenticators\Session $authenticator */
        $authenticator = auth('session')->getAuthenticator();
        $authenticator->login($user);

        return $this->response->setStatusCode(201)->setJSON([
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
            'subscription_tier' => $user->subscription_tier ?? 'pilot',
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
