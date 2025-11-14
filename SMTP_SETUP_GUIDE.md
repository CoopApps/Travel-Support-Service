# 📧 SMTP Email Setup Guide

## Quick Start (Choose One Option)

---

## Option 1: Gmail (Fastest - 10 minutes)

**Best For**: Development, testing, small-scale pilot (< 100 emails/day)

### Steps:

1. **Enable 2-Factor Authentication**
   - Go to: https://myaccount.google.com/security
   - Click "2-Step Verification"
   - Follow the setup process

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it: "Travel Support Platform"
   - Click "Generate"
   - **Copy the 16-character password** (looks like: `abcd efgh ijkl mnop`)

3. **Update .env**
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=abcdefghijklmnop  # No spaces
   ```

4. **Test It**
   ```bash
   cd backend
   node -e "
   const nodemailer = require('nodemailer');
   const transporter = nodemailer.createTransporter({
     host: 'smtp.gmail.com',
     port: 587,
     auth: {
       user: 'your-email@gmail.com',
       pass: 'your-app-password'
     }
   });
   transporter.sendMail({
     from: 'your-email@gmail.com',
     to: 'your-email@gmail.com',
     subject: 'Test Email',
     text: 'SMTP configuration works!'
   }).then(info => console.log('✅ Email sent:', info.messageId))
     .catch(err => console.error('❌ Error:', err.message));
   "
   ```

**Limits**: 500 emails/day

---

## Option 2: SendGrid (Recommended for Production)

**Best For**: Production, commercial launch, higher volume

### Steps:

1. **Sign Up**
   - Go to: https://sendgrid.com
   - Create free account
   - Free tier: 100 emails/day forever
   - Paid: Starting at $15/month for 40k emails

2. **Verify Sender Identity**
   - Settings → Sender Authentication
   - Choose "Domain Authentication" (better) or "Single Sender Verification" (faster)
   - For domain: Add DNS records they provide
   - For single sender: Click verification email link

3. **Create API Key**
   - Settings → API Keys → Create API Key
   - Name it: "Travel Support Production"
   - Select "Full Access" or "Mail Send" only
   - **Copy the API key** (starts with `SG.`)
   - **Save it immediately** - you can't see it again!

4. **Update .env**
   ```bash
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASS=SG.your-actual-api-key-here
   ```

5. **Test It**
   ```bash
   cd backend
   node -e "
   const nodemailer = require('nodemailer');
   const transporter = nodemailer.createTransport({
     host: 'smtp.sendgrid.net',
     port: 587,
     auth: {
       user: 'apikey',
       pass: 'SG.your-api-key'
     }
   });
   transporter.sendMail({
     from: 'your-verified-email@yourdomain.com',
     to: 'test@example.com',
     subject: 'Test Email via SendGrid',
     text: 'SendGrid is working!'
   }).then(info => console.log('✅ Email sent:', info.messageId))
     .catch(err => console.error('❌ Error:', err.message));
   "
   ```

**Limits**: 100 emails/day (free), 40,000/month ($15/mo)

---

## Option 3: AWS SES (Best for Scale)

**Best For**: High volume, cost optimization (after 100+ customers)

### Steps:

1. **Create AWS Account**
   - Go to: https://aws.amazon.com
   - Sign up (free tier available)

2. **Setup SES**
   - Go to SES Console: https://console.aws.amazon.com/ses
   - Choose region (e.g., us-east-1)
   - Verify domain or email address
   - Request production access (starts in sandbox mode)

3. **Create SMTP Credentials**
   - SES → SMTP Settings → Create SMTP Credentials
   - **Download credentials** (username and password)

4. **Update .env**
   ```bash
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-smtp-username
   SMTP_PASS=your-smtp-password
   ```

**Limits**:
- Sandbox: 200 emails/day to verified addresses
- Production: 50,000 emails/month FREE, then $0.10 per 1,000

**Pricing**: Cheapest at scale ($0.10 per 1,000 emails)

---

## Testing Your Configuration

### Test 1: SMTP Connection

```bash
cd backend
node -e "
const transporter = require('nodemailer').createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

transporter.verify()
  .then(() => console.log('✅ SMTP connection successful'))
  .catch(err => console.error('❌ SMTP connection failed:', err.message));
"
```

### Test 2: Send Test Email

```bash
# Start your server
npm run dev

# In another terminal, test password reset
curl -X POST http://localhost:3001/api/tenants/1/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Check your email inbox for the password reset email
```

---

## Troubleshooting

### "Invalid login" error with Gmail

**Solution**:
- Make sure 2FA is enabled
- Use App Password, not your regular Gmail password
- Remove any spaces from the app password

### "Could not verify sender" with SendGrid

**Solution**:
- Complete sender verification first
- Use the exact verified email address in `from` field
- Wait 5-10 minutes after verification

### Emails going to spam

**Solution**:
- Use domain authentication (not single sender)
- Set up SPF, DKIM, DMARC DNS records
- Warm up your domain (start with low volume)
- Use a professional email address (not Gmail)

### "Connection timeout"

**Solution**:
- Check firewall allows outbound port 587
- Try port 465 with `SMTP_SECURE=true`
- Verify SMTP credentials are correct

---

## Production Checklist

Before going live:

- [ ] SMTP credentials configured in .env
- [ ] Test email sent successfully
- [ ] Password reset flow tested end-to-end
- [ ] Welcome email tested for new tenant registration
- [ ] Sender email address is professional (not Gmail in production)
- [ ] Domain authentication configured (SendGrid/SES)
- [ ] Email sending rate limits understood
- [ ] Monitoring set up for email delivery failures

---

## Current Status

Your .env file is ready with:
- ✅ Secure JWT_SECRET generated
- ✅ Secure ENCRYPTION_KEY generated
- ⚠️ SMTP_USER and SMTP_PASS need to be filled in

**Next Step**: Choose an option above and fill in your SMTP credentials!

---

## Need Help?

- Gmail App Passwords: https://support.google.com/accounts/answer/185833
- SendGrid Docs: https://docs.sendgrid.com/for-developers/sending-email/smtp-guide
- AWS SES Docs: https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html
