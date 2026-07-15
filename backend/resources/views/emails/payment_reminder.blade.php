<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Reminder</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f8fafc;
            color: #334155;
            margin: 0;
            padding: 0;
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
            overflow: hidden;
        }
        .header {
            background-color: #4A0E17;
            padding: 30px;
            text-align: center;
            color: #ffffff;
        }
        .header h1 {
            margin: 0;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .content {
            padding: 30px;
        }
        .greeting {
            font-size: 16px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 12px;
        }
        .lead-text {
            font-size: 15px;
            color: #475569;
            margin-bottom: 24px;
        }
        .section-title {
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            color: #4A0E17;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
            margin-top: 20px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 5px;
        }
        .details-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 25px;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
        }
        .details-table td {
            padding: 8px 0;
            font-size: 14px;
        }
        .details-table td.label {
            color: #64748b;
            font-weight: 600;
            width: 40%;
        }
        .details-table td.value {
            color: #1e293b;
            font-weight: 700;
            text-align: right;
        }
        .divider {
            border-top: 1px solid #e2e8f0;
            margin: 15px 0;
        }
        .warning-box {
            background-color: #fff1f2;
            border-left: 4px solid #e11d48;
            border-radius: 4px;
            padding: 15px;
            font-size: 13px;
            color: #be123c;
            font-weight: 600;
            margin-bottom: 20px;
        }
        .officer-box {
            background-color: #f0fdf4;
            border-left: 4px solid #22c55e;
            border-radius: 4px;
            padding: 15px;
            font-size: 13px;
            color: #166534;
            margin-bottom: 20px;
        }
        .footer {
            background-color: #f1f5f9;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
        }
        .footer p {
            margin: 4px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="{{ $message->embed(public_path('images/supremogen_logo.jpg')) }}" alt="Supremogen Logo" style="height: 64px; width: 64px; border-radius: 12px; object-fit: contain; margin-bottom: 12px; background-color: #ffffff; padding: 4px; display: inline-block;">
            <h1>Supremogen Insurance Services</h1>
        </div>
        <div class="content">
            <div class="greeting">Greetings!</div>
            <div class="lead-text">
                Friendly reminder for your PAYMENT with Supremogen Insurance Services.
            </div>

            <div class="section-title">Policy Details</div>
            <div class="details-card">
                <table class="details-table">
                    <tr>
                        <td class="label">Assured Name</td>
                        <td class="value">{{ $customerName }}</td>
                    </tr>
                    <tr>
                        <td class="label">Plate Number</td>
                        <td class="value">{{ $plateNumber }}</td>
                    </tr>
                    <tr>
                        <td class="label">Policy Number</td>
                        <td class="value">{{ $policyNumber }}</td>
                    </tr>
                </table>
            </div>

            <div class="warning-box">
                <div style="font-size: 16px; margin-bottom: 5px;">🔴 {{ $installmentOrdinal }} PAYMENT</div>
                <div>DUE DATE: {{ $dueDate }}</div>
                <div>Amount Due: ₱{{ number_format($installmentAmount, 2) }}</div>
            </div>

            <p style="font-size: 13px; color: #475569; margin-bottom: 15px;">
                Please settle <strong>ON OR BEFORE YOUR DUE DATE TO AVOID POLICY CANCELLATION</strong>. Reply with your settlement date. If paid, inform your agent and send confirmation to:
            </p>

            <div class="officer-box">
                <div style="font-weight: 700; text-transform: uppercase;">VIBER : COLLECTION OFFICER</div>
                <div style="font-size: 16px; font-weight: 800; margin-top: 3px;">0994 138 6387</div>
            </div>

            <div class="warning-box" style="background-color: #fff1f2; border: 1px dashed #e11d48; border-left: 4px solid #e11d48;">
                ⚠️ REMINDER: FAILURE TO PAY the installment due will result in POLICY CANCELLATION.
            </div>

            <p style="font-size: 14px; font-weight: 600; color: #4A0E17; margin-top: 25px;">
                Thank you!
            </p>
        </div>
        <div class="footer">
            <p><strong>Supremogen Insurance Services</strong></p>
            <p>&copy; {{ date('Y') }} Supremogen. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
