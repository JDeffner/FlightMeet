<?php

declare(strict_types=1);

namespace App\Models;

use CodeIgniter\Shield\Models\UserModel as ShieldUserModel;

/**
 * App user model — Shield's UserModel plus the custom profile fields.
 *
 * All user validation rules live here so admin CRUD, the self-service
 * profile API and direct model saves share one definition.
 */
class UserModel extends ShieldUserModel
{
    /** FlightMeet membership tiers (see landing pricing / SPECIFICATION). */
    public const TIERS = ['pilot', 'club', 'school'];

    private const USERNAME_RULES = "min_length[3]|max_length[30]|regex_match[/\\A[\\p{L}\\p{N}\\.\\-_' ]+\\z/u]";

    /** Rules for the plain profile columns on the `users` table. */
    private const PROFILE_FIELD_RULES = [
        'vorname'           => 'permit_empty|max_length[50]',
        'nachname'          => 'permit_empty|max_length[50]',
        'strasse'           => 'permit_empty|max_length[100]',
        'plz'               => 'permit_empty|max_length[10]',
        'ort'               => 'permit_empty|max_length[100]',
        'subscription_tier' => 'permit_empty|in_list[pilot,club,school]',
    ];

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
            'subscription_tier',
        ];

        // Safety net: any save() through this model validates the
        // users-table columns, no matter which controller triggered it.
        $this->validationRules = [
            'username' => 'permit_empty|' . self::USERNAME_RULES,
            ...self::PROFILE_FIELD_RULES,
        ];
    }

    /**
     * Full rule set for creating a user (admin API).
     * email/password live outside the `users` table (auth_identities),
     * so they are validated per request rather than on model save.
     */
    public static function createRules(): array
    {
        return [
            'username' => 'required|' . self::USERNAME_RULES . '|is_unique[users.username]',
            'email'    => 'required|max_length[254]|valid_email|is_unique[auth_identities.secret]',
            'password' => 'required|min_length[8]',
            'group'    => 'required|in_list[' . implode(',', array_keys(config('AuthGroups')->groups)) . ']',
            ...self::PROFILE_FIELD_RULES,
        ];
    }

    /**
     * Full rule set for updating a user (admin API). Every field is
     * optional; uniqueness checks exclude the user's own records.
     */
    public static function updateRules(int $id): array
    {
        return [
            'username' => 'permit_empty|' . self::USERNAME_RULES . "|is_unique[users.username,id,{$id}]",
            'email'    => "permit_empty|max_length[254]|valid_email|is_unique[auth_identities.secret,user_id,{$id}]",
            'password' => 'permit_empty|min_length[8]',
            'group'    => 'permit_empty|in_list[' . implode(',', array_keys(config('AuthGroups')->groups)) . ']',
            ...self::PROFILE_FIELD_RULES,
        ];
    }

    /**
     * Rule set for the self-service profile API — like an admin update,
     * but without group/active/tier (tier changes go through the
     * dedicated subscription endpoint).
     */
    public static function profileRules(int $id): array
    {
        $rules = self::updateRules($id);
        unset($rules['group'], $rules['subscription_tier']);

        return $rules;
    }
}
