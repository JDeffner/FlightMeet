<?php

namespace App\Controllers;

use CodeIgniter\HTTP\ResponseInterface;

class Api extends BaseController
{
    /**
     * GET /api/ping
     * Simple health check — proves the frontend can reach the backend.
     */
    public function ping(): ResponseInterface
    {
        return $this->response->setJSON([
            'status'    => 'ok',
            'message'   => 'pong',
            'timestamp' => date('c'),
            'php'       => PHP_VERSION,
            'ci'        => \CodeIgniter\CodeIgniter::CI_VERSION,
        ]);
    }

    /**
     * POST /api/echo
     * Echoes back whatever JSON the client sent — proves request bodies round-trip.
     */
    public function echoData(): ResponseInterface
    {
        $payload = $this->request->getJSON(true) ?? [];

        return $this->response->setJSON([
            'status'   => 'ok',
            'received' => $payload,
            'method'   => $this->request->getMethod(),
        ]);
    }
}
