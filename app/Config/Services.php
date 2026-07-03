<?php

namespace Config;

use CodeIgniter\Config\BaseService;

/**
 * Services Configuration file.
 *
 * Services are simply other classes/libraries that the system uses
 * to do its job. This is used by CodeIgniter to allow the core of the
 * framework to be swapped out easily without affecting the usage within
 * the rest of your application.
 *
 * This file holds any application-specific services, or service overrides
 * that you might need. An example has been included with the general
 * method format you should use for your service methods. For more examples,
 * see the core Services file at system/Config/Services.php.
 */
class Services extends BaseService
{
    /*
     * public static function example($getShared = true)
     * {
     *     if ($getShared) {
     *         return static::getSharedInstance('example');
     *     }
     *
     *     return new \CodeIgniter\Example();
     * }
     */

    /**
     * CURLRequest client preconfigured for the Open-Meteo forecast API.
     *
     * Usage: service('openMeteo')->get('v1/forecast', ['query' => [...]]);
     *
     * @return \CodeIgniter\HTTP\CURLRequest
     */
    public static function openMeteo(bool $getShared = true)
    {
        if ($getShared) {
            return static::getSharedInstance('openMeteo');
        }

        // getShared: false — the framework's shared curlrequest instance would
        // otherwise be reused across clients, clobbering the baseURI.
        return static::curlrequest(
            [
                'baseURI'     => 'https://api.open-meteo.com/',
                'timeout'     => 10,
                'http_errors' => false,
            ],
            null,
            null,
            false,
        );
    }

    /**
     * CURLRequest client preconfigured for the Open-Meteo geocoding API
     * (resolves city names to coordinates).
     *
     * @return \CodeIgniter\HTTP\CURLRequest
     */
    public static function openMeteoGeocoding(bool $getShared = true)
    {
        if ($getShared) {
            return static::getSharedInstance('openMeteoGeocoding');
        }

        return static::curlrequest(
            [
                'baseURI'     => 'https://geocoding-api.open-meteo.com/',
                'timeout'     => 10,
                'http_errors' => false,
            ],
            null,
            null,
            false,
        );
    }
}
