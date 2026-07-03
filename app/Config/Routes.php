<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 *
 * CodeIgniter is JSON-API-only. Non-API paths are served by the built React
 * SPA (public/index.html) — via public/.htaccess in production, and the Vite
 * dev server during development. No CI routes render HTML.
 */
$routes->get('/', 'Home::index');

$routes->group('api', static function ($routes) {
    $routes->get('ping', 'Api::ping');
    $routes->post('echo', 'Api::echoData');

    // Authentication (session-based, JSON)
    $routes->group('auth', static function ($routes) {
        $routes->get('me', 'Api\AuthController::me');
        $routes->post('login', 'Api\AuthController::login');
        $routes->post('logout', 'Api\AuthController::logout');
    });

    // Admin area — requires session + admin.access (see AdminApiFilter)
    $routes->group('admin', ['filter' => 'adminapi'], static function ($routes) {
        $routes->get('users', 'Api\Admin\UsersController::index');
        $routes->post('users', 'Api\Admin\UsersController::create');
        $routes->get('users/(:num)', 'Api\Admin\UsersController::show/$1');
        $routes->put('users/(:num)', 'Api\Admin\UsersController::update/$1');
        $routes->delete('users/(:num)', 'Api\Admin\UsersController::delete/$1');
    });
});
