<?php

declare(strict_types=1);

namespace App\Models;

use CodeIgniter\Shield\Models\UserModel as ShieldUserModel;

/**
 * App user model — Shield's UserModel plus the custom profile fields.
 */
class UserModel extends ShieldUserModel
{
    protected function initialize(): void
    {
        parent::initialize();

        $this->allowedFields = [
            ...$this->allowedFields,
            'vorname',
            'nachname',
            'strasse',
            'plz',
            'ort',
        ];
    }
}
