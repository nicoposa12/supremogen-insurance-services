<?php

namespace App\Mail\Transports;

use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\MessageConverter;
use Illuminate\Support\Facades\Http;

class BrevoTransport extends AbstractTransport
{
    protected $key;

    public function __construct(string $key)
    {
        parent::__construct();
        $this->key = $key;
    }

    protected function doSend(SentMessage $message): void
    {
        $email = MessageConverter::toEmail($message->getOriginalMessage());
        
        $to = [];
        foreach ($email->getTo() as $address) {
            $to[] = [
                'email' => $address->getAddress(),
                'name' => $address->getName() ?: null,
            ];
        }

        $senderAddress = $email->getFrom()[0] ?? null;
        $sender = $senderAddress ? [
            'email' => $senderAddress->getAddress(),
            'name' => $senderAddress->getName() ?: null,
        ] : [
            'email' => config('mail.from.address'),
            'name' => config('mail.from.name'),
        ];

        // Format HTML content
        $htmlContent = $email->getHtmlBody();
        if (is_resource($htmlContent)) {
            $htmlContent = stream_get_contents($htmlContent);
        }

        // Format text content
        $textContent = $email->getTextBody();
        if (is_resource($textContent)) {
            $textContent = stream_get_contents($textContent);
        }

        // Format attachments
        $attachments = [];
        foreach ($email->getAttachments() as $attachment) {
            $attachments[] = [
                'name' => $attachment->getPreparedHeaders()->getHeaderParameter('Content-Type', 'name') 
                          ?: $attachment->getPreparedHeaders()->getHeaderParameter('Content-Disposition', 'filename') 
                          ?: 'attachment',
                'content' => base64_encode($attachment->getBody()),
            ];
        }

        $payload = [
            'sender' => $sender,
            'to' => $to,
            'subject' => $email->getSubject(),
            'htmlContent' => $htmlContent ?: ($textContent ?: ''),
        ];

        if ($textContent) {
            $payload['textContent'] = $textContent;
        }

        if (!empty($attachments)) {
            $payload['attachment'] = $attachments;
        }

        $response = Http::withHeaders([
            'api-key' => $this->key,
            'accept' => 'application/json',
            'content-type' => 'application/json',
        ])->post('https://api.brevo.com/v3/smtp/email', $payload);

        if ($response->failed()) {
            throw new \Exception('Failed to send email via Brevo API: ' . $response->body());
        }
    }

    public function __toString(): string
    {
        return 'brevo';
    }
}
