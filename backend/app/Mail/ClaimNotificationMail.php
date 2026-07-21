<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ClaimNotificationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $referenceNumber;
    public $assuredName;
    public $contactNumber;
    public $emailAddress;
    public $insuranceProvider;
    public $plateNumber;
    public $policyNumber;
    public $inceptionDate;
    public $accidentDate;
    public $natureOfClaims;
    public $notes;
    public $submitterName;
    public $attachmentsData;

    /**
     * Create a new message instance.
     */
    public function __construct(
        string $referenceNumber,
        string $assuredName,
        ?string $contactNumber,
        ?string $emailAddress,
        string $insuranceProvider,
        ?string $plateNumber,
        string $policyNumber,
        ?string $inceptionDate,
        string $accidentDate,
        string $natureOfClaims,
        ?string $notes,
        string $submitterName,
        ?iterable $attachmentsData = []
    ) {
        $this->referenceNumber = $referenceNumber;
        $this->assuredName = $assuredName;
        $this->contactNumber = $contactNumber;
        $this->emailAddress = $emailAddress;
        $this->insuranceProvider = $insuranceProvider;
        $this->plateNumber = $plateNumber;
        $this->policyNumber = $policyNumber;
        $this->inceptionDate = $inceptionDate;
        $this->accidentDate = $accidentDate;
        $this->natureOfClaims = $natureOfClaims;
        $this->notes = $notes;
        $this->submitterName = $submitterName;
        $this->attachmentsData = $attachmentsData ?? [];
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Claim Notification - ' . $this->referenceNumber . ' (' . $this->assuredName . ')',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.claim_notification',
        );
    }

    /**
     * Get the attachments for the message.
     */
    public function attachments(): array
    {
        $mailAttachments = [];
        foreach ($this->attachmentsData as $att) {
            if (\Illuminate\Support\Facades\Storage::exists($att->file_path)) {
                $mailAttachments[] = \Illuminate\Mail\Mailables\Attachment::fromPath(
                    \Illuminate\Support\Facades\Storage::path($att->file_path)
                )->as($att->file_name)->withMime($att->mime_type);
            }
        }
        return $mailAttachments;
    }
}
