<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\UserModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * Self-service profile API. All routes are behind the `apiauth` filter,
 * so auth()->user() is always available.
 */
class ProfileController extends BaseController
{
    /**
     * GET /api/profile
     */
    public function show(): ResponseInterface
    {
        return $this->response->setJSON([
            'user' => AuthController::formatUser(auth()->user()),
        ]);
    }

    /**
     * PUT /api/profile
     * Updates the logged-in user's own data (no group/active/tier here).
     */
    public function update(): ResponseInterface
    {
        $user = auth()->user();
        $data = $this->request->getJSON(true) ?? [];

        $validation = service('validation');
        $validation->setRules(UserModel::profileRules((int) $user->id));

        if (! $validation->run($data)) {
            return $this->response->setStatusCode(422)->setJSON([
                'errors' => $validation->getErrors(),
            ]);
        }

        foreach (['username', 'vorname', 'nachname', 'strasse', 'plz', 'ort'] as $field) {
            if (array_key_exists($field, $data)) {
                $user->{$field} = $data[$field] !== '' ? $data[$field] : null;
            }
        }
        if (! empty($data['email']) && $data['email'] !== $user->email) {
            $user->email = $data['email'];
        }
        if (! empty($data['password'])) {
            $user->password = $data['password'];
        }

        $users = auth()->getProvider();
        if (! $users->save($user)) {
            return $this->response->setStatusCode(422)->setJSON([
                'errors' => $users->errors(),
            ]);
        }

        return $this->response->setJSON([
            'user' => AuthController::formatUser($users->findById($user->id)),
        ]);
    }

    /**
     * PUT /api/profile/subscription
     * Body: { "tier": "pilot" | "club" | "school" }
     * No payment flow yet — switching tiers is free (see landing pricing).
     */
    public function updateSubscription(): ResponseInterface
    {
        $data = $this->request->getJSON(true) ?? [];

        $validation = service('validation');
        $validation->setRules([
            'tier' => 'required|in_list[' . implode(',', UserModel::TIERS) . ']',
        ]);

        if (! $validation->run($data)) {
            return $this->response->setStatusCode(422)->setJSON([
                'errors' => $validation->getErrors(),
            ]);
        }

        $user                    = auth()->user();
        $user->subscription_tier = $data['tier'];

        $users = auth()->getProvider();
        if (! $users->save($user)) {
            return $this->response->setStatusCode(422)->setJSON([
                'errors' => $users->errors(),
            ]);
        }

        return $this->response->setJSON([
            'user' => AuthController::formatUser($users->findById($user->id)),
        ]);
    }
}
