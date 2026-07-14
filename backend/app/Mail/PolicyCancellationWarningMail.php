<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PolicyCancellationWarningMail extends Mailable
{
    use Queueable, SerializesModels;

    public $customerName;
    public $policyNumber;

    /**
     * Create a new message instance.
     */
    public function __construct(
        string $customerName,
        string $policyNumber
    ) {
        $this->customerName = $customerName;
        $this->policyNumber = $policyNumber;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'URGENT: Insurance Policy At Risk For Cancellation - ' . $this->policyNumber,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.policy_cancellation_warning',
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
