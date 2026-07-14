<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PaymentReceiptMail extends Mailable
{
    use Queueable, SerializesModels;

    public $customerName;
    public $policyNumber;
    public $installmentOrdinal;
    public $amountPaid;
    public $balance;

    /**
     * Create a new message instance.
     */
    public function __construct(
        string $customerName,
        string $policyNumber,
        string $installmentOrdinal,
        float $amountPaid,
        float $balance
    ) {
        $this->customerName = $customerName;
        $this->policyNumber = $policyNumber;
        $this->installmentOrdinal = $installmentOrdinal;
        $this->amountPaid = $amountPaid;
        $this->balance = $balance;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Payment Confirmation: ' . $this->installmentOrdinal . ' PAYMENT - ' . $this->policyNumber,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.payment_receipt',
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
