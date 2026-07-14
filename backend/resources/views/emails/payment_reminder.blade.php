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
            width: 45%;
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
        .instructions-header {
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            color: #4A0E17;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
        }
        .bank-details {
            background-color: #fdf2f4;
            border-left: 4px solid #4A0E17;
            border-radius: 4px 8px 8px 4px;
            padding: 15px;
            margin-bottom: 15px;
        }
        .bank-name {
            font-size: 13px;
            font-weight: 700;
            color: #4A0E17;
            margin: 0 0 5px 0;
        }
        .bank-info {
            font-size: 13px;
            color: #475569;
            margin: 0;
        }
        .notice {
            font-size: 13px;
            color: #64748b;
            background-color: #f1f5f9;
            padding: 12px;
            border-radius: 8px;
            margin-top: 25px;
            text-align: center;
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
            <h1>Supremogen Insurance Services</h1>
        </div>
        <div class="content">
            <div class="greeting">Dear {{ $customerName }},</div>
            <div class="lead-text">
                This is a friendly reminder that the <strong>{{ $installmentOrdinal }}</strong> installment of your insurance premium is due on <strong>{{ $dueDate }}</strong>.
            </div>

            <div class="details-card">
                <table class="details-table">
                    <tr>
                        <td class="label">Policy Number</td>
                        <td class="value">{{ $policyNumber }}</td>
                    </tr>
                    <tr>
                        <td class="label">Installment Term</td>
                        <td class="value">{{ $installmentOrdinal }} of {{ $totalTerms }} Months</td>
                    </tr>
                    <tr>
                        <td class="label">Installment Amount</td>
                        <td class="value" style="color: #4A0E17; font-size: 16px;">₱{{ number_format($installmentAmount, 2) }}</td>
                    </tr>
                    <tr>
                        <td class="divider" colspan="2"></td>
                    </tr>
                    <tr>
                        <td class="label">Remaining Balance</td>
                        <td class="value">₱{{ number_format($balance, 2) }}</td>
                    </tr>
                </table>
            </div>

            <div class="instructions-header">Payment Instructions</div>
            <p style="font-size: 13px; color: #475569; margin-top: 0; margin-bottom: 15px;">
                You can settle your payment through bank transfer to either of the following accounts:
            </p>

            <div class="bank-details">
                <p class="bank-name">BANK TRANSFER - PBCOM</p>
                <p class="bank-info">
                    Account Name: <strong>Supremogen Insurance Services</strong><br>
                    Account Number: <strong>227101004869</strong>
                </p>
            </div>

            <div class="bank-details">
                <p class="bank-name">BANK TRANSFER - SECURITY BANK</p>
                <p class="bank-info">
                    Account Name: <strong>Supremogen Insurance Services</strong><br>
                    Account Number: <strong>(Contact your Agent / office for details)</strong>
                </p>
            </div>

            <div class="notice">
                Please reply to this email with a screenshot of your bank transfer receipt or deposit slip so we can record your payment in the system.
            </div>
        </div>
        <div class="footer">
            <p><strong>Supremogen Insurance Services</strong></p>
            <p>If you have already settled this payment, please disregard this email.</p>
            <p>&copy; {{ date('Y') }} Supremogen. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
