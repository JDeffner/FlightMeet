<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 *
 * CodeIgniter is JSON-API-only. Non-API paths are served by the built React
 * SPA (public/index.html) — via public/.htaccess in production, and the Vite
 * dev server during development. No CI routes render HTML.
 */
// The homepage is served by the React SPA (public/index.html), not a CI view.
// CodeIgniter only handles the JSON API and media below.
$routes->group('api', static function ($routes) {
    $routes->get('ping', 'Api::ping');
    $routes->post('echo', 'Api::echoData');
    $routes->get('weather', 'Weather::index');
    // Cached weather reports (public). Registered before the bare `weather`
    // handler would ever be a concern; these are distinct exact paths.
    $routes->get('weather/reports', 'Weather::reports');
    $routes->post('weather/reports/(:num)/refresh', 'Weather::refresh/$1');

    // Public recent-activity feed for the landing page
    $routes->get('activity', 'Api\ActivityController::index');

    // Public pilot profiles by username
    $routes->get('users/(:segment)', 'Api\UsersController::show/$1');

    // Authentication (session-based, JSON)
    $routes->group('auth', static function ($routes) {
        $routes->get('me', 'Api\AuthController::me');
        $routes->post('register', 'Api\AuthController::register');
        $routes->post('login', 'Api\AuthController::login');
        $routes->post('logout', 'Api\AuthController::logout');
    });

    // FlightMeet meets — list/detail/weather are public, mutations need a session
    $routes->get('meets', 'Api\MeetsController::index');
    $routes->post('meets', 'Api\MeetsController::create', ['filter' => 'apiauth']);
    $routes->get('meets/(:num)', 'Api\MeetsController::show/$1');
    $routes->put('meets/(:num)', 'Api\MeetsController::update/$1', ['filter' => 'apiauth']);
    $routes->get('meets/(:num)/weather', 'Api\MeetsController::weather/$1');
    $routes->post('meets/(:num)/join', 'Api\MeetsController::join/$1', ['filter' => 'apiauth']);
    $routes->delete('meets/(:num)/join', 'Api\MeetsController::leave/$1', ['filter' => 'apiauth']);

    // FlightMeet groups — list/detail are public, mutations need a session
    $routes->get('groups', 'Api\GroupsController::index');
    $routes->post('groups', 'Api\GroupsController::create', ['filter' => 'apiauth']);
    $routes->get('groups/(:num)', 'Api\GroupsController::show/$1');
    $routes->put('groups/(:num)', 'Api\GroupsController::update/$1', ['filter' => 'apiauth']);
    $routes->post('groups/(:num)/join', 'Api\GroupsController::join/$1', ['filter' => 'apiauth']);
    $routes->delete('groups/(:num)/join', 'Api\GroupsController::leave/$1', ['filter' => 'apiauth']);

    // FlightMeet chat — session required (group channels also need membership)
    $routes->group('chat', ['filter' => 'apiauth'], static function ($routes) {
        $routes->get('messages', 'Api\ChatController::index');
        $routes->post('messages', 'Api\ChatController::create');
        $routes->delete('messages/(:num)', 'Api\ChatController::destroy/$1');
    });

    // Own profile — requires a logged-in session (see ApiAuthFilter)
    $routes->group('profile', ['filter' => 'apiauth'], static function ($routes) {
        $routes->get('/', 'Api\ProfileController::show');
        $routes->put('/', 'Api\ProfileController::update');
        $routes->put('subscription', 'Api\ProfileController::updateSubscription');
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
