<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\OpenMeteo;
use App\Libraries\Participant;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * FlightMeet meets API (see docs/API_FLIGHTMEET.md).
 *
 * Participant counts and the full/open status are always derived from
 * meet_participants at read time — never stored (NFR-4).
 */
class MeetsController extends BaseController
{
    private const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All levels'];

    /**
     * GET /api/meets — all meets, date ascending. Public.
     */
    public function index(): ResponseInterface
    {
        $userId = auth()->id() ?? 0;

        $rows = db_connect()->query(
            'SELECT m.*, COUNT(p.id) AS participant_count,
                    COALESCE(MAX(p.user_id = ?), 0) AS joined
             FROM meets m
             LEFT JOIN meet_participants p ON p.meet_id = m.id
             GROUP BY m.id
             ORDER BY m.date ASC, m.time ASC, m.id ASC',
            [$userId],
        )->getResultArray();

        return $this->response->setJSON([
            'data' => array_map(fn (array $row): array => $this->summary($row), $rows),
        ]);
    }

    /**
     * GET /api/meets/{id} — detail incl. participants. Public.
     */
    public function show(int $id): ResponseInterface
    {
        $meet = $this->detail($id);

        if ($meet === null) {
            return $this->meetNotFound();
        }

        return $this->response->setJSON(['meet' => $meet]);
    }

    /**
     * POST /api/meets — create a meet. Session required.
     * Geocodes the spot (fallback: region) when coordinates are omitted;
     * an unresolvable spot stores NULLs, never a hard error (FR-12).
     */
    public function create(): ResponseInterface
    {
        $data = $this->request->getJSON(true) ?? [];

        $validation = service('validation');
        $validation->setRules($this->meetRules());

        if (! $validation->run($data)) {
            return $this->response->setStatusCode(422)->setJSON([
                'errors' => $validation->getErrors(),
            ]);
        }

        if ($data['date'] < date('Y-m-d')) {
            return $this->response->setStatusCode(422)->setJSON([
                'errors' => ['date' => 'The date must not be in the past.'],
            ]);
        }

        $latitude  = isset($data['latitude']) && $data['latitude'] !== '' ? (float) $data['latitude'] : null;
        $longitude = isset($data['longitude']) && $data['longitude'] !== '' ? (float) $data['longitude'] : null;

        if ($latitude === null || $longitude === null) {
            $openMeteo = new OpenMeteo();
            $resolved  = $openMeteo->geocode($data['spot']) ?? $openMeteo->geocode($data['region']);

            $latitude  = $resolved['latitude'] ?? null;
            $longitude = $resolved['longitude'] ?? null;
        }

        $now = date('Y-m-d H:i:s');
        $db  = db_connect();

        $db->table('meets')->insert([
            'title'            => $data['title'],
            'spot'             => $data['spot'],
            'region'           => $data['region'],
            'date'             => $data['date'],
            'time'             => $data['time'],
            'description'      => $data['description'],
            'level'            => $data['level'],
            'max_participants' => (int) $data['maxParticipants'],
            'latitude'         => $latitude,
            'longitude'        => $longitude,
            'created_by'       => auth()->id(),
            'created_at'       => $now,
            'updated_at'       => $now,
        ]);

        return $this->response->setStatusCode(201)->setJSON([
            'meet' => $this->detail((int) $db->insertID()),
        ]);
    }

    /**
     * PUT /api/meets/{id} — edit a meet. Session required.
     * Allowed for the creator or an admin (403 otherwise). Same body and
     * validation as create, plus: maxParticipants must be >= the current
     * participant count; a changed date must not be in the past (an
     * unchanged past date may be re-saved); coordinates are kept when spot
     * and region are unchanged, otherwise re-geocoded like create.
     */
    public function update(int $id): ResponseInterface
    {
        $db   = db_connect();
        $meet = $db->table('meets')->where('id', $id)->get()->getRowArray();

        if ($meet === null) {
            return $this->meetNotFound();
        }

        if ((int) $meet['created_by'] !== auth()->id() && ! auth()->user()->inGroup('admin')) {
            return $this->response->setStatusCode(403)->setJSON([
                'error' => 'Only the organizer can edit this meet.',
            ]);
        }

        $data = $this->request->getJSON(true) ?? [];

        $validation = service('validation');
        $validation->setRules($this->meetRules());

        if (! $validation->run($data)) {
            return $this->response->setStatusCode(422)->setJSON([
                'errors' => $validation->getErrors(),
            ]);
        }

        $count = $db->table('meet_participants')->where('meet_id', $id)->countAllResults();

        if ((int) $data['maxParticipants'] < $count) {
            return $this->response->setStatusCode(422)->setJSON([
                'errors' => ['maxParticipants' => sprintf(
                    'This meet already has %d participants.',
                    $count,
                )],
            ]);
        }

        // Only guard against a past date when the date actually changed.
        if ($data['date'] !== $meet['date'] && $data['date'] < date('Y-m-d')) {
            return $this->response->setStatusCode(422)->setJSON([
                'errors' => ['date' => 'The date must not be in the past.'],
            ]);
        }

        $latitude  = isset($data['latitude']) && $data['latitude'] !== '' ? (float) $data['latitude'] : null;
        $longitude = isset($data['longitude']) && $data['longitude'] !== '' ? (float) $data['longitude'] : null;

        if ($latitude === null || $longitude === null) {
            if ($data['spot'] === $meet['spot'] && $data['region'] === $meet['region']) {
                // Location unchanged — keep the stored coordinates.
                $latitude  = $meet['latitude'] === null ? null : (float) $meet['latitude'];
                $longitude = $meet['longitude'] === null ? null : (float) $meet['longitude'];
            } else {
                $openMeteo = new OpenMeteo();
                $geo       = $openMeteo->geocode($data['spot']) ?? $openMeteo->geocode($data['region']);

                $latitude  = $geo['latitude'] ?? null;
                $longitude = $geo['longitude'] ?? null;
            }
        }

        $db->table('meets')->where('id', $id)->update([
            'title'            => $data['title'],
            'spot'             => $data['spot'],
            'region'           => $data['region'],
            'date'             => $data['date'],
            'time'             => $data['time'],
            'description'      => $data['description'],
            'level'            => $data['level'],
            'max_participants' => (int) $data['maxParticipants'],
            'latitude'         => $latitude,
            'longitude'        => $longitude,
            'updated_at'       => date('Y-m-d H:i:s'),
        ]);

        return $this->response->setJSON(['meet' => $this->detail($id)]);
    }

    /**
     * POST /api/meets/{id}/join — session required.
     * 409 when the meet is full or the user has already joined.
     */
    public function join(int $id): ResponseInterface
    {
        $db   = db_connect();
        $meet = $db->table('meets')->select('id, max_participants')->where('id', $id)->get()->getRowArray();

        if ($meet === null) {
            return $this->meetNotFound();
        }

        $userId = auth()->id();

        $alreadyJoined = $db->table('meet_participants')
            ->where('meet_id', $id)
            ->where('user_id', $userId)
            ->countAllResults() > 0;

        if ($alreadyJoined) {
            return $this->conflict('You have already joined this meet.');
        }

        $count = $db->table('meet_participants')->where('meet_id', $id)->countAllResults();

        if ($count >= (int) $meet['max_participants']) {
            return $this->conflict('This meet is full.');
        }

        $db->table('meet_participants')->insert([
            'meet_id'    => $id,
            'user_id'    => $userId,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->response->setJSON(['meet' => $this->detail($id)]);
    }

    /**
     * DELETE /api/meets/{id}/join — session required.
     * 409 when the user has not joined the meet.
     */
    public function leave(int $id): ResponseInterface
    {
        $db = db_connect();

        if ($db->table('meets')->where('id', $id)->countAllResults() === 0) {
            return $this->meetNotFound();
        }

        $db->table('meet_participants')
            ->where('meet_id', $id)
            ->where('user_id', auth()->id())
            ->delete();

        if ($db->affectedRows() === 0) {
            return $this->conflict('You have not joined this meet.');
        }

        return $this->response->setJSON(['meet' => $this->detail($id)]);
    }

    /**
     * GET /api/meets/{id}/weather — forecast for the meet's stored
     * coordinates, same payload shape as GET /api/weather. Public.
     */
    public function weather(int $id): ResponseInterface
    {
        $meet = db_connect()->table('meets')
            ->select('spot, region, latitude, longitude')
            ->where('id', $id)
            ->get()
            ->getRowArray();

        if ($meet === null) {
            return $this->meetNotFound();
        }

        if ($meet['latitude'] === null || $meet['longitude'] === null) {
            return $this->conflict('This meet has no coordinates.');
        }

        $forecast = (new OpenMeteo())->forecast((float) $meet['latitude'], (float) $meet['longitude']);

        if ($forecast === null) {
            return $this->response->setStatusCode(502)->setJSON([
                'status'  => 'error',
                'message' => 'The weather service is currently unavailable. Please try again later.',
            ]);
        }

        return $this->response->setJSON([
            'status'   => 'ok',
            'location' => [
                'name'      => $meet['spot'],
                'country'   => $meet['region'],
                'latitude'  => (float) $meet['latitude'],
                'longitude' => (float) $meet['longitude'],
            ],
            'forecast' => $forecast,
        ]);
    }

    // --------------------------------------------------------------------

    /** Shared validation rules for create and update. */
    private function meetRules(): array
    {
        return [
            'title'           => 'required|max_length[120]',
            'spot'            => 'required|max_length[120]',
            'region'          => 'required|max_length[80]',
            'date'            => 'required|valid_date[Y-m-d]',
            'time'            => 'required|regex_match[/\A([01][0-9]|2[0-3]):[0-5][0-9]\z/]',
            'level'           => 'required|in_list[' . implode(',', self::LEVELS) . ']',
            'maxParticipants' => 'required|is_natural_no_zero|less_than_equal_to[65535]',
            'description'     => 'required|max_length[5000]',
            'latitude'        => 'permit_empty|decimal|greater_than_equal_to[-90]|less_than_equal_to[90]',
            'longitude'       => 'permit_empty|decimal|greater_than_equal_to[-180]|less_than_equal_to[180]',
        ];
    }

    /**
     * MeetSummary from a meets row carrying the derived
     * participant_count and joined columns.
     */
    private function summary(array $row): array
    {
        $count = (int) $row['participant_count'];
        $max   = (int) $row['max_participants'];

        return [
            'id'               => (int) $row['id'],
            'title'            => $row['title'],
            'spot'             => $row['spot'],
            'region'           => $row['region'],
            'date'             => $row['date'],
            'time'             => substr($row['time'], 0, 5),
            'description'      => $row['description'],
            'level'            => $row['level'],
            'maxParticipants'  => $max,
            'participantCount' => $count,
            'status'           => $count >= $max ? 'full' : 'open',
            'joined'           => (bool) $row['joined'],
        ];
    }

    /**
     * MeetDetail (summary + coordinates, participants, createdBy),
     * or null when the meet does not exist.
     */
    private function detail(int $id): ?array
    {
        $db     = db_connect();
        $userId = auth()->id() ?? 0;

        $row = $db->query(
            'SELECT m.*, COUNT(p.id) AS participant_count,
                    COALESCE(MAX(p.user_id = ?), 0) AS joined
             FROM meets m
             LEFT JOIN meet_participants p ON p.meet_id = m.id
             WHERE m.id = ?
             GROUP BY m.id',
            [$userId, $id],
        )->getRowArray();

        if ($row === null) {
            return null;
        }

        $participants = $db->query(
            'SELECT u.id, u.username, u.vorname, u.nachname
             FROM meet_participants p
             JOIN users u ON u.id = p.user_id
             WHERE p.meet_id = ?
             ORDER BY p.id ASC',
            [$id],
        )->getResultArray();

        $creator = $db->table('users')
            ->select('id, username, vorname, nachname')
            ->where('id', (int) $row['created_by'])
            ->get()
            ->getRowArray();

        $detail                 = $this->summary($row);
        $detail['latitude']     = $row['latitude'] === null ? null : (float) $row['latitude'];
        $detail['longitude']    = $row['longitude'] === null ? null : (float) $row['longitude'];
        $detail['participants'] = array_map([Participant::class, 'format'], $participants);
        $detail['createdBy']    = Participant::format($creator);

        return $detail;
    }

    private function meetNotFound(): ResponseInterface
    {
        return $this->response->setStatusCode(404)->setJSON(['error' => 'Meet not found.']);
    }

    private function conflict(string $message): ResponseInterface
    {
        return $this->response->setStatusCode(409)->setJSON(['error' => $message]);
    }
}
