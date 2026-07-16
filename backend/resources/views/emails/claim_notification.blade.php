<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claim Notification - {{ $referenceNumber }}</title>
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
            vertical-align: top;
        }
        .details-table td.label {
            color: #64748b;
            font-weight: 600;
            width: 40%;
        }
        .details-table td.value {
            color: #1e293b;
            font-weight: 500;
        }
        .nature-section {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 25px;
        }
        .nature-title {
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
        }
        .nature-text {
            font-size: 14px;
            color: #1e293b;
            white-space: pre-wrap;
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
            <h1>Claim Notification FAO</h1>
        </div>
        <div class="content">
            <div class="greeting">Good day,</div>
            <div class="lead-text">
                Kindly see below information of our Assured as claim notification.
            </div>

            <div class="details-card">
                <table class="details-table">
                    <tr>
                        <td class="label">Reference Number</td>
                        <td class="value" style="font-weight: 700; color: #4A0E17;">{{ $referenceNumber }}</td>
                    </tr>
                    <tr>
                        <td class="label">Assured Name</td>
                        <td class="value" style="font-weight: 600;">{{ $assuredName }}</td>
                    </tr>
                    <tr>
                        <td class="label">Contact Number</td>
                        <td class="value">{{ $contactNumber ?: '—' }}</td>
                    </tr>
                    <tr>
                        <td class="label">Email Address</td>
                        <td class="value">{{ $emailAddress ?: '—' }}</td>
                    </tr>
                    <tr>
                        <td class="label">Insurance Provider</td>
                        <td class="value">{{ $insuranceProvider }}</td>
                    </tr>
                    <tr>
                        <td class="label">Plate Number</td>
                        <td class="value">{{ $plateNumber ?: '—' }}</td>
                    </tr>
                    <tr>
                        <td class="label">Policy Number</td>
                        <td class="value">{{ $policyNumber }}</td>
                    </tr>
                    <tr>
                        <td class="label">Inception Date</td>
                        <td class="value">{{ $inceptionDate ? \Carbon\Carbon::parse($inceptionDate)->format('M d, Y') : '—' }}</td>
                    </tr>
                    <tr>
                        <td class="label">Accident Date</td>
                        <td class="value">{{ \Carbon\Carbon::parse($accidentDate)->format('M d, Y') }}</td>
                    </tr>
                </table>
            </div>

            <div class="nature-section">
                <div class="nature-title">Nature of Claims</div>
                <div class="nature-text">{{ $natureOfClaims }}</div>
            </div>

            @if($notes)
            <div class="nature-section" style="border-left: 4px solid #f59e0b; background-color: #fffbeb;">
                <div class="nature-title" style="color: #b45309;">Note</div>
                <div class="nature-text" style="color: #78350f;">{{ $notes }}</div>
            </div>
            @endif

            <p style="font-size: 13px; color: #64748b;">
                Submitted by: <strong>{{ $submitterName }}</strong>
            </p>
        </div>
        <div class="footer">
            <p><strong>Supremogen Insurance Services</strong></p>
            <p>&copy; {{ date('Y') }} Supremogen. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
