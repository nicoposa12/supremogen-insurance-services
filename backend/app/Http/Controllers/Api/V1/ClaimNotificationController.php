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
            'attachments',
            'policy.quotation:id,quotation_number,ir_number,is_remitted,remitted_at',
            'quotation:id,quotation_number,ir_number,is_remitted,remitted_at',
        ])
            ->search($request->input('search'))
            ->ofStatus($request->input('status'));

        if ($request->filled('claim_count')) {
            $query->where('claim_count', $request->input('claim_count'));
        }

        if ($request->filled('created_date')) {
            $query->whereDate('created_at', $request->input('created_date'));
        }

        if ($request->filled('role')) {
            $roleFilter = $request->input('role');
            $query->whereHas('submittedBy', function ($q) use ($roleFilter) {
                $q->whereHas('roles', function ($rq) use ($roleFilter) {
                    $rq->where('name', $roleFilter);
                });
            });
        }

        // Non-admin, non-claims-officer, non-auditing users see only their own submissions
        $user  = $request->user();
        $roles = $user->getRoleNames()->toArray();

        $isAdmin         = in_array('Administrator', $roles) || in_array('Owner', $roles) || in_array('Super Admin', $roles);
        $isClaimsOfficer = in_array('Claims Officer', $roles);
        $isAccounting    = in_array('Accounting Officer', $roles);
        $isUnderwriter   = in_array('Underwriter', $roles);
        $isManager       = in_array('General Manager', $roles) || in_array('Operational Manager', $roles) || in_array('Team Support Operation', $roles);

        $canViewAll = $isAdmin || $isClaimsOfficer || $isAccounting || $isUnderwriter || $isManager;

        if (!$canViewAll) {
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
            'accident_date'      => 'required|date|before_or_equal:today',
            'accident_reason'    => 'nullable|string|max:5000',
            'nature_of_claims'   => 'nullable|string|max:5000',
            'notes'              => 'nullable|string|max:5000',
            'claim_count'        => 'required|string|max:255',
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
            'accident_reason'    => $request->input('accident_reason'),
            'nature_of_claims'   => $request->input('nature_of_claims') ?? '',
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
            'policy.quotation:id,quotation_number,ir_number,is_remitted,remitted_at',
            'quotation:id,quotation_number,ir_number,is_remitted,remitted_at',
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

        if (!in_array($record->status, ['pending', 'resubmitted'])) {
            return response()->json(['success' => false, 'message' => 'This notification cannot be acknowledged.'], 422);
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
     * Claims Officer marks the claim notification requirements as completed.
     */
    public function completeRequirements(Request $request, string $id)
    {
        $record = ClaimNotification::find($id);

        if (!$record) {
            return response()->json(['success' => false, 'message' => 'Claim notification not found.'], 404);
        }

        $record->update([
            'status' => 'completed',
        ]);

        try {
            \App\Models\Notification::create([
                'user_id' => $record->submitted_by,
                'title'   => 'Claim Requirements Completed',
                'message' => "The requirements for claim notification {$record->reference_number} have been marked as completed by the Claims Officer.",
                'type'    => 'success',
                'read_at' => null,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to notify claim notification submitter on completion: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Claim notification requirements marked as completed.',
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

        if (!in_array($record->status, ['pending', 'resubmitted'])) {
            return response()->json(['success' => false, 'message' => 'Only pending or resubmitted notifications can be returned.'], 422);
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

    /**
     * Update/resubmit a returned claim notification.
     */
    public function update(Request $request, string $id)
    {
        $record = ClaimNotification::find($id);

        if (!$record) {
            return response()->json(['success' => false, 'message' => 'Claim notification not found.'], 404);
        }

        // Only returned notifications can be resubmitted/edited by agents
        if ($record->status !== 'returned') {
            return response()->json(['success' => false, 'message' => 'Only returned notifications can be edited/resubmitted.'], 422);
        }

        $validator = Validator::make($request->all(), [
            'assured_name'       => 'required|string|max:255',
            'contact_number'     => 'nullable|string|max:50',
            'email_address'      => 'nullable|email|max:255',
            'insurance_provider' => 'required|string|max:255',
            'plate_number'       => 'nullable|string|max:30',
            'accident_date'      => 'required|date|before_or_equal:today',
            'accident_reason'    => 'nullable|string|max:5000',
            'nature_of_claims'   => 'nullable|string|max:5000',
            'notes'              => 'nullable|string|max:5000',
            'claim_count'        => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $record->update([
            'assured_name'       => $request->input('assured_name'),
            'contact_number'     => $request->input('contact_number'),
            'email_address'      => $request->input('email_address'),
            'insurance_provider' => $request->input('insurance_provider'),
            'plate_number'       => $request->input('plate_number'),
            'policy_number'      => $request->input('policy_number'),
            'inception_date'     => $request->input('inception_date'),
            'accident_date'      => $request->input('accident_date'),
            'accident_reason'    => $request->input('accident_reason'),
            'nature_of_claims'   => $request->input('nature_of_claims') ?? '',
            'notes'              => $request->input('notes'),
            'claim_count'        => $request->input('claim_count'),
            'status'             => 'resubmitted', // reset to resubmitted on resubmit
        ]);

        // Notify all Claims Officers
        try {
            $officers = \App\Models\User::role('Claims Officer')->get();
            foreach ($officers as $officer) {
                \App\Models\Notification::create([
                    'user_id' => $officer->id,
                    'title'   => 'Claim Notification Resubmitted',
                    'message' => "Claim notification {$record->reference_number} has been resubmitted for assured \"{$record->assured_name}\" — Policy {$record->policy_number}.",
                    'type'    => 'warning',
                    'read_at' => null,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to send claim notification alert on resubmit: ' . $e->getMessage());
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
                    $record->inception_date ? ($record->inception_date instanceof \Carbon\Carbon ? $record->inception_date->toDateString() : $record->inception_date) : null,
                    $record->accident_date instanceof \Carbon\Carbon ? $record->accident_date->toDateString() : $record->accident_date,
                    $record->nature_of_claims,
                    $record->notes,
                    $request->user()->name
                );

                $mailable->subject("[RESUBMITTED CLAIM NOTIFICATION] {$record->reference_number} - {$record->assured_name}");

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
            Log::error('Failed to send resubmitted claim notification email: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Claim notification resubmitted successfully.',
            'data'    => $record->fresh(['submittedBy:id,name', 'acknowledgedBy:id,name']),
        ]);
    }

    /**
     * Email the claim notification and all attachments to the insurance provider manually.
     */
    public function sendEmailToProvider(Request $request, string $id)
    {
        if (!$request->user()->hasRole('Claims Officer') && !$request->user()->hasRole('Administrator')) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only Claims Officers can send emails to providers.'
            ], 403);
        }

        $record = ClaimNotification::with(['attachments'])->find($id);

        if (!$record) {
            return response()->json(['success' => false, 'message' => 'Claim notification not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'to'   => 'required|array|min:1|max:10',
            'to.*' => 'required|email|max:255',
            'cc'   => 'nullable|array|max:10',
            'cc.*' => 'nullable|email|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed: ' . implode(', ', $validator->errors()->all()),
                'errors'  => $validator->errors(),
            ], 422);
        }

        $toEmails = $request->input('to');
        $ccEmails = $request->input('cc', []);

        try {
            $mailable = new \App\Mail\ClaimNotificationMail(
                $record->reference_number,
                $record->assured_name,
                $record->contact_number,
                $record->email_address,
                $record->insurance_provider,
                $record->plate_number,
                $record->policy_number,
                $record->inception_date ? ($record->inception_date instanceof \Carbon\Carbon ? $record->inception_date->toDateString() : $record->inception_date) : null,
                $record->accident_date instanceof \Carbon\Carbon ? $record->accident_date->toDateString() : $record->accident_date,
                $record->nature_of_claims,
                $record->notes,
                $request->user()->name,
                $record->attachments
            );

            // Set custom subject indicating it has attachments/requirements
            $mailable->subject("[CLAIM REQUIREMENTS] {$record->reference_number} - {$record->assured_name}");

            $mail = \Illuminate\Support\Facades\Mail::to($toEmails);
            if (!empty($ccEmails)) {
                $mail->cc($ccEmails);
            }

            $mail->send($mailable);

            return response()->json([
                'success' => true,
                'message' => 'Claim notification and requirements emailed to insurance provider successfully.',
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send claim notification email manually: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to send email: ' . $e->getMessage(),
            ], 500);
        }
    }
}
