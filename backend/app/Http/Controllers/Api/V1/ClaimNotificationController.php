<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ClaimNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class ClaimNotificationController extends Controller
{
    /**
     * Paginated list of claim notifications.
     */
    public function index(Request $request)
    {
        $perPage = min((int) $request->input('per_page', 15), 100);
        $sortBy  = $request->input('sort_by', 'created_at');
        $sortDir = strtolower($request->input('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $allowed = ['reference_number', 'assured_name', 'accident_date', 'status', 'created_at'];
        if (!in_array($sortBy, $allowed)) $sortBy = 'created_at';

        $query = ClaimNotification::with([
            'submittedBy:id,name',
            'acknowledgedBy:id,name',
        ])
            ->search($request->input('search'))
            ->ofStatus($request->input('status'));

        if ($request->filled('claim_count')) {
            $query->where('claim_count', $request->input('claim_count'));
        }

        // Non-admin, non-claims-officer users see only their own submissions
        $user  = $request->user();
        $roles = $user->getRoleNames()->toArray();

        $isAdmin         = in_array('Administrator', $roles) || in_array('Owner', $roles);
        $isClaimsOfficer = in_array('Claims Officer', $roles);
        $isAccounting    = in_array('Accounting Officer', $roles);

        if (!$isAdmin && !$isClaimsOfficer && !$isAccounting) {
            $query->where('submitted_by', $user->id);
        }

        $records = $query
            ->orderBy($sortBy, $sortDir)
            ->paginate($perPage)
            ->appends($request->query());

        return response()->json(['success' => true, 'data' => $records]);
    }

    /**
     * Submit a new claim notification.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'assured_name'       => 'required|string|max:255',
            'contact_number'     => 'nullable|string|max:50',
            'email_address'      => 'nullable|email|max:255',
            'insurance_provider' => 'required|string|max:255',
            'plate_number'       => 'nullable|string|max:30',
            'policy_number'      => 'required|string|max:50',
            'inception_date'     => 'nullable|date',
            'accident_date'      => 'required|date|before_or_equal:today',
            'nature_of_claims'   => 'required|string|max:5000',
            'notes'              => 'nullable|string|max:5000',
            'claim_count'        => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $record = ClaimNotification::create([
            'reference_number'   => ClaimNotification::generateNumber(),
            'assured_name'       => $request->input('assured_name'),
            'contact_number'     => $request->input('contact_number'),
            'email_address'      => $request->input('email_address'),
            'insurance_provider' => $request->input('insurance_provider'),
            'plate_number'       => $request->input('plate_number'),
            'policy_number'      => $request->input('policy_number'),
            'inception_date'     => $request->input('inception_date'),
            'accident_date'      => $request->input('accident_date'),
            'nature_of_claims'   => $request->input('nature_of_claims'),
            'notes'              => $request->input('notes'),
            'claim_count'        => $request->input('claim_count'),
            'submitted_by'       => $request->user()->id,
            'status'             => 'pending',
        ]);

        // Notify all Claims Officers
        try {
            $officers = \App\Models\User::role('Claims Officer')->get();
            foreach ($officers as $officer) {
                \App\Models\Notification::create([
                    'user_id' => $officer->id,
                    'title'   => 'Claim Notification Received',
                    'message' => "New claim notification {$record->reference_number} for assured \"{$record->assured_name}\" — Policy {$record->policy_number}.",
                    'type'    => 'warning',
                    'read_at' => null,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to send claim notification alert: ' . $e->getMessage());
        }

        // Email the Insurance Provider
        try {
            $provider = $record->insurance_provider;
            $providerEmails = [
                'ALPHA' => [
                    'to' => ['aileen.canoza@yahoo.com', 'Cherryalphaisnurance@yahoo.com', 'polan.alphainsurance@gmail.com', 'amdavocol.aisci@gmail.com'],
                    'cc' => ['catalankarlamaysalestl@gmail.com', 'jccristobal@supremogen.com', 'jmozar.supremogen@gmail.com'],
                ],
                'MILESTONE' => [
                    'to' => ['lowella.nipales@milestoneguaranty.com', 'Jvillanueva@milestoneguaranty.com', 'jesus.salcedo@milestoneguaranty.com'],
                    'cc' => ['catalankarlamaysalestl@gmail.com', 'jccristobal@supremogen.com', 'jmozar.supremogen@gmail.com'],
                ],
                'CBIC' => [
                    'to' => ['roselyncbic@gmail.com', 'enricomendoza8971@yahoo.com', 'dave.cbic@gmail.com', 'claims@countrybankers.com', 'jcdeguzman.cbic@gmail.com', 'casurban@yahoo.com'],
                    'cc' => ['catalankarlamaysalestl@gmail.com', 'jccristobal@supremogen.com', 'jmozar.supremogen@gmail.com'],
                ],
                'METROPOLITAN' => [
                    'to' => ['claims@miciph.com', 'mcamtan@miciph.com', 'csantos@miciph.com'],
                    'cc' => ['catalankarlamaysalestl@gmail.com', 'jccristobal@supremogen.com', 'jmozar.supremogen@gmail.com'],
                ],
                'BETHEL' => [
                    'to' => ['jfvanguardia@bethelgen.com', 'dbendozo@bethelgen.com', 'rsvelasquez@bethelgen.com'],
                    'cc' => ['catalankarlamaysalestl@gmail.com', 'jccristobal@supremogen.com', 'jmozar.supremogen@gmail.com'],
                ],
                'PHILIPPINE BRITISH' => [
                    'to' => ['catalankarlamaysalestl@gmail.com', 'sales@supremogen.com'],
                    'cc' => ['jccristobal@supremogen.com'],
                    'bcc' => ['jmozar.supremogen@gmail.com'],
                ]
            ];

            if (isset($providerEmails[$provider])) {
                $emails = $providerEmails[$provider];
                $mailable = new \App\Mail\ClaimNotificationMail(
                    $record->reference_number,
                    $record->assured_name,
                    $record->contact_number,
                    $record->email_address,
                    $record->insurance_provider,
                    $record->plate_number,
                    $record->policy_number,
                    $record->inception_date ? $record->inception_date->toDateString() : null,
                    $record->accident_date->toDateString(),
                    $record->nature_of_claims,
                    $record->notes,
                    $request->user()->name
                );

                $mail = \Illuminate\Support\Facades\Mail::to($emails['to']);
                if (!empty($emails['cc'])) {
                    $mail->cc($emails['cc']);
                }
                if (!empty($emails['bcc'])) {
                    $mail->bcc($emails['bcc']);
                }

                $mail->send($mailable);
            }
        } catch (\Exception $e) {
            Log::error('Failed to send claim notification email: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Claim notification submitted successfully.',
            'data'    => $record->load('submittedBy:id,name'),
        ], 201);
    }

    /**
     * Show a single claim notification.
     */
    public function show(string $id)
    {
        $record = ClaimNotification::with([
            'submittedBy:id,name,email',
            'acknowledgedBy:id,name,email',
            'attachments.uploadedBy:id,name',
        ])->find($id);

        if (!$record) {
            return response()->json(['success' => false, 'message' => 'Claim notification not found.'], 404);
        }

        return response()->json(['success' => true, 'data' => $record]);
    }

    /**
     * Claims Officer acknowledges a pending claim notification.
     */
    public function acknowledge(Request $request, string $id)
    {
        $record = ClaimNotification::find($id);

        if (!$record) {
            return response()->json(['success' => false, 'message' => 'Claim notification not found.'], 404);
        }

        if ($record->status !== 'pending') {
            return response()->json(['success' => false, 'message' => 'This notification has already been acknowledged.'], 422);
        }

        $record->update([
            'status'          => 'acknowledged',
            'acknowledged_by' => $request->user()->id,
            'acknowledged_at' => now(),
        ]);

        // Notify the submitter
        try {
            \App\Models\Notification::create([
                'user_id' => $record->submitted_by,
                'title'   => 'Claim Notification Acknowledged',
                'message' => "Your claim notification {$record->reference_number} has been acknowledged by the Claims Officer.",
                'type'    => 'success',
                'read_at' => null,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to notify claim notification submitter: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Claim notification acknowledged.',
            'data'    => $record->fresh(['submittedBy:id,name', 'acknowledgedBy:id,name']),
        ]);
    }

    /**
     * Claims Officer returns a pending claim notification to the agent/submitter.
     */
    public function returnToAgent(Request $request, string $id)
    {
        $record = ClaimNotification::find($id);

        if (!$record) {
            return response()->json(['success' => false, 'message' => 'Claim notification not found.'], 404);
        }

        if ($record->status !== 'pending') {
            return response()->json(['success' => false, 'message' => 'Only pending notifications can be returned.'], 422);
        }

        $reason = $request->input('reason', '');
        
        $updateData = [
            'status' => 'returned',
        ];
        if ($reason) {
            $updateData['notes'] = trim(($record->notes ? $record->notes . "\n\n" : "") . "[RETURN REASON BY CLAIMS OFFICER]:\n" . $reason);
        }

        $record->update($updateData);

        // Notify the submitter
        try {
            \App\Models\Notification::create([
                'user_id' => $record->submitted_by,
                'title'   => 'Claim Notification Returned',
                'message' => "Your claim notification {$record->reference_number} was returned by the Claims Officer." . ($reason ? " Reason: {$reason}" : ""),
                'type'    => 'error',
                'read_at' => null,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to notify claim notification submitter on return: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Claim notification returned to agent.',
            'data'    => $record->fresh(['submittedBy:id,name', 'acknowledgedBy:id,name']),
        ]);
    }
}
