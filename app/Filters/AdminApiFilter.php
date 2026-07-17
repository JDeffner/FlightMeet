<?php

declare(strict_types=1);

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * Protects admin API routes: requires a logged-in session AND the
 * `admin.access` permission. Returns JSON errors (no redirects) so the
 * SPA can handle 401/403 cleanly.
 */
class AdminApiFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        if (! auth('session')->loggedIn()) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON(['error' => 'Not authenticated.']);
        }

        if (! auth()->user()->can('admin.access')) {
            return service('response')
                ->setStatusCode(403)
                ->setJSON(['error' => 'Admin access required.']);
        }

        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return null;
    }
}
