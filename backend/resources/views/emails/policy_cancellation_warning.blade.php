<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Policy Cancellation Warning</title>
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
            background-color: #be123c;
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
            color: #e11d48;
            font-weight: 600;
            margin-bottom: 24px;
        }
        .section-title {
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            color: #be123c;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
            margin-top: 20px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 5px;
        }
        .details-card {
            background-color: #fff1f2;
            border: 1px solid #ffe4e6;
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
            color: #be123c;
            font-weight: 600;
            width: 40%;
        }
        .details-table td.value {
            color: #9f1239;
            font-weight: 700;
            text-align: right;
        }
        .divider {
            border-top: 1px solid #ffe4e6;
            margin: 15px 0;
        }
        .warning-box {
            background-color: #fff1f2;
            border-left: 4px solid #be123c;
            border-radius: 4px;
            padding: 15px;
            font-size: 13px;
            color: #9f1239;
            font-weight: 600;
            margin-bottom: 20px;
        }
        .officer-box {
            background-color: #f8fafc;
            border-left: 4px solid #64748b;
            border-radius: 4px;
            padding: 15px;
            font-size: 13px;
            color: #334155;
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
            <img src="{{ asset('images/supremogen_logo.jpg') }}" alt="Supremogen Logo" style="height: 64px; width: 64px; border-radius: 12px; object-fit: contain; margin-bottom: 12px; background-color: #ffffff; padding: 4px; display: inline-block;">
            <h1>Supremogen Insurance Services</h1>
        </div>
        <div class="content">
            <div class="greeting">Hello Valued Client,</div>
            <div class="lead-text">
                We're reaching out to inform you that your car insurance policy IS AT RISK FOR CANCELLATION due to a delayed payment.
            </div>

            <div class="section-title">Policy Details</div>
            <div class="details-card">
                <table class="details-table">
                    <tr>
                        <td class="label">Assured Name</td>
                        <td class="value">{{ $customerName }}</td>
                    </tr>
                    <tr>
                        <td class="label">Policy Number</td>
                        <td class="value">{{ $policyNumber }}</td>
                    </tr>
                </table>
            </div>

            <div class="warning-box">
                ⚠️ To avoid policy cancellation, please make the necessary payment within THREE (3) days from this notice. If already paid, kindly send confirmation to this email address or contact number.
            </div>

            <div class="officer-box">
                <div style="font-weight: 700; text-transform: uppercase;">For assistance, call:</div>
                <div style="font-weight: 700; text-transform: uppercase; margin-top: 5px; color: #be123c;">VIBER : COLLECTION OFFICER</div>
                <div style="font-size: 16px; font-weight: 800; margin-top: 3px; color: #be123c;">0994 138 6387</div>
            </div>
        </div>
        <div class="footer">
            <p><strong>Supremogen Insurance Services</strong></p>
            <p>&copy; {{ date('Y') }} Supremogen. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
