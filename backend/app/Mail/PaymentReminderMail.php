<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PaymentReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public $customerName;
    public $policyNumber;
    public $installmentOrdinal;
    public $totalTerms;
    public $installmentAmount;
    public $balance;
    public $dueDate;
    public $plateNumber;

    /**
     * Create a new message instance.
     */
    public function __construct(
        string $customerName,
        string $policyNumber,
        string $installmentOrdinal,
        int $totalTerms,
        float $installmentAmount,
        float $balance,
        string $dueDate,
        string $plateNumber = 'N/A'
    ) {
        $this->customerName = $customerName;
        $this->policyNumber = $policyNumber;
        $this->installmentOrdinal = $installmentOrdinal;
        $this->totalTerms = $totalTerms;
        $this->installmentAmount = $installmentAmount;
        $this->balance = $balance;
        $this->dueDate = $dueDate;
        $this->plateNumber = $plateNumber;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Payment Reminder: ' . $this->installmentOrdinal . ' PAYMENT - ' . $this->policyNumber,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.payment_reminder',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
