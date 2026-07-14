<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Confirmation</title>
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
            <h1>Supremogen Insurance</h1>
        </div>
        <div class="content">
            <div class="greeting">Hello Sir/Ma'am,</div>
            <div class="lead-text">
                Thank you for your <strong>{{ $installmentOrdinal }} PAYMENT</strong> for the car insurance policy. This email confirms the receipt of your payment, and we have successfully updated your account accordingly.
            </div>

            <div class="details-card">
                <table class="details-table">
                    <tr>
                        <td class="label">Policy Number</td>
                        <td class="value">{{ $policyNumber }}</td>
                    </tr>
                    <tr>
                        <td class="label">Payment Stage</td>
                        <td class="value">{{ $installmentOrdinal }} PAYMENT</td>
                    </tr>
                    <tr>
                        <td class="label">Amount Paid</td>
                        <td class="value" style="color: #047857; font-size: 16px;">₱{{ number_format($amountPaid, 2) }}</td>
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
        </div>
        <div class="footer">
            <p><strong>Supremogen Insurance Services</strong></p>
            <p>&copy; {{ date('Y') }} Supremogen. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
