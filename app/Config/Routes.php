<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */
$routes->get('/', 'Home::index');
$routes->get('weather', 'Weather::index');

$routes->group('api', static function ($routes) {
    $routes->get('ping', 'Api::ping');
    $routes->post('echo', 'Api::echoData');
});
