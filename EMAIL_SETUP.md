# Email Service Integration for Tech Fiesta 2025

This document explains the email service integration with automatic rotation for handling registration confirmation emails.

## Features

- ✅ **Email Rotation**: Automatically rotates between 5 Gmail accounts to avoid rate limits
- ✅ **Registration Confirmation**: Sends detailed registration emails with event/workshop information
- ✅ **Daily Usage Tracking**: Monitors and resets email usage counters daily
- ✅ **Error Handling**: Graceful fallback to next email account if one fails
- ✅ **Professional Templates**: HTML email templates with event details and QR code information
- ✅ **CIT Student Detection**: Different pricing display for CIT students
- ✅ **Payment Integration**: Sends emails after successful payment verification

## Setup Instructions

### 1. Gmail Account Setup

You need to set up 5 Gmail accounts with app passwords:

1. **Enable 2-Factor Authentication** on each Gmail account
2. **Generate App Passwords** for each account:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Select "App passwords" under "2-Step Verification"
   - Generate a 16-character app password
   - Save this password (you'll need it in environment variables)

### 2. Environment Variables

Add these variables to your `.env` file:

```env
# Email Account 1
EMAIL_1=techfiesta1@gmail.com
EMAIL_1_PASSWORD=abcd efgh ijkl mnop

# Email Account 2
EMAIL_2=techfiesta2@gmail.com
EMAIL_2_PASSWORD=abcd efgh ijkl mnop

# Email Account 3
EMAIL_3=techfiesta3@gmail.com
EMAIL_3_PASSWORD=abcd efgh ijkl mnop

# Email Account 4
EMAIL_4=techfiesta4@gmail.com
EMAIL_4_PASSWORD=abcd efgh ijkl mnop

# Email Account 5
EMAIL_5=techfiesta5@gmail.com
EMAIL_5_PASSWORD=abcd efgh ijkl mnop

# Frontend URL for dashboard links
FRONTEND_URL=https://techfiesta2025.com
```

### 3. Install Dependencies

```bash
npm install nodemailer
```

## Email Service Features

### Automatic Rotation

- Each email account has a daily limit of 500 emails
- The service automatically rotates to the next account for each email
- Usage counters reset daily at midnight
- If one account fails, it tries the next available account

### Registration Confirmation Email

- Sent automatically after successful payment verification
- Includes complete registration details
- Lists all registered events and workshops with details
- Shows payment information and registration ID
- Provides dashboard link for QR codes
- Mobile-responsive HTML template

### Email Templates Include:

- **Registration Details**: ID, email, student type, payment info
- **Selected Pass**: If a pass was purchased
- **Tech Events**: List of registered technical events with dates/venues
- **Workshops**: List of registered workshops with details
- **Non-Tech Events**: Events that require payment at venue
- **QR Code Information**: Instructions for accessing QR codes
- **Important Instructions**: Guidelines for event attendance

## API Endpoints

### Check Email Service Status

```http
GET /api/payment/email-status
Authorization: Bearer <token>
```

Response:

```json
{
  "success": true,
  "data": {
    "emailConfigs": [
      {
        "index": 1,
        "email": "tec***@gmail.com",
        "isConfigured": true,
        "currentUsage": 45,
        "dailyLimit": 500,
        "isActive": true
      }
    ],
    "totalConfigured": 5,
    "totalUsage": 127
  }
}
```

### Test Email Service

```http
POST /api/payment/test-email
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "registration" // or "test"
}
```

### Debug Configuration

```http
GET /api/payment/debug-config
Authorization: Bearer <token>
```

## Email Flow

1. **Payment Created** → Order stored in Firebase
2. **Payment Verified** → Registration created in database
3. **Email Triggered** → Automatic confirmation email sent
4. **Email Rotation** → Next account used for subsequent emails
5. **Error Handling** → Fallback to next account if current fails

## Monitoring

### Email Usage Tracking

- Each account tracks daily usage
- Automatic rotation when limits are reached
- Status monitoring via API endpoints
- Error logging for failed sends

### Daily Reset

- Usage counters reset at midnight
- Automatic rotation starts fresh
- No manual intervention required

## Error Handling

- **Authentication Errors**: Automatically tries next email account
- **Rate Limits**: Switches to next available account
- **Network Issues**: Graceful degradation, doesn't fail registration
- **Missing Configuration**: Detailed error messages in logs

## Best Practices

1. **Monitor Usage**: Check email status regularly during high-traffic periods
2. **Test Regularly**: Use test endpoints to verify email service health
3. **Backup Accounts**: Keep all 5 accounts active and monitored
4. **Log Analysis**: Monitor logs for email delivery issues
5. **Rate Management**: The service automatically manages Gmail's daily limits

## Troubleshooting

### Common Issues:

1. **"Invalid credentials"**: Check app passwords are correct
2. **"Rate limit exceeded"**: Service should auto-rotate, check if all accounts are configured
3. **"Email not sent"**: Check debug-config endpoint for configuration status
4. **"Authentication failed"**: Verify 2FA is enabled and app passwords are generated correctly

### Debug Steps:

1. Check configuration: `GET /api/payment/debug-config`
2. Test email service: `POST /api/payment/test-email`
3. Monitor email status: `GET /api/payment/email-status`
4. Check server logs for detailed error messages

## File Structure

```
Tech-fiesta-backend/
├── services/
│   └── emailService.js          # Main email service with rotation
├── routes/
│   └── payment.js              # Payment routes with email integration
├── .env.example                # Environment variables template
└── EMAIL_SETUP.md             # This documentation
```

## Integration Points

The email service is integrated at these points:

1. **Payment Verification** (`/verify-payment`): Sends confirmation after manual payment verification
2. **Webhook Handler** (`/webhook`): Sends confirmation after webhook payment capture
3. **Free Registration**: No email for free registrations (amount = 0)

This ensures users receive confirmation emails regardless of how their payment is processed.
