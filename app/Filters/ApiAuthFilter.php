<?php

declare(strict_types=1);

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * Protects authenticated (non-admin) API routes: requires a logged-in
 * session. Returns JSON errors (no redirects) so the SPA can handle 401.
 */
class ApiAuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        if (! auth('session')->loggedIn()) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON(['error' => 'Not authenticated.']);
        }

        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return null;
    }
}
