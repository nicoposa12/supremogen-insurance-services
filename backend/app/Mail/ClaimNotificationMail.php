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
        string $submitterName
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
        return [];
    }
}
