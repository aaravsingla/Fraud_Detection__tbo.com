# Asterisk IVR + SMTP Setup for Fraud Verification

This guide covers deploying a real Asterisk PBX for IVR phone verification and configuring SMTP for email OTP delivery. For prototype/demo, the system uses mock clients that simulate both flows — no Asterisk or SMTP server needed.

---

## Architecture

### IVR Call Flow

```
┌──────────────┐  HTTP POST /channels  ┌──────────────────┐   SIP/PJSIP    ┌─────────────┐
│  Node.js     │ ────────────────────→ │  Asterisk PBX    │ ─────────────→ │  Phone      │
│  Backend     │                       │  (ARI + Stasis)  │                │  (Agent)    │
│              │  ←── ARI WebSocket ── │                  │ ←── DTMF ──── │             │
│              │   (ChannelDtmfReceived)                  │   (keypad)    │             │
└──────────────┘                       └──────────────────┘               └─────────────┘
```

**IVR Flow (Real Mode):**
1. Node backend calls ARI `POST /channels` to originate a call via PJSIP
2. Node backend connects via **ARI WebSocket** (`ws://asterisk:8088/ari/events`) for real-time events
3. `StasisStart` event fired → Node answers the channel and plays verification prompt
4. Agent enters 6-digit code via DTMF (phone keypad)
5. `ChannelDtmfReceived` events stream to Node → digits accumulated
6. After 6 digits (or `#` terminator) → Node validates code, plays success/failure prompt, hangs up

### Email OTP Flow

```
┌──────────────┐   SMTP/STARTTLS    ┌──────────────────┐               ┌─────────────┐
│  Node.js     │ ─────────────────→ │  SMTP Server     │ ────────────→ │  Email      │
│  (nodemailer)│                    │  (Gmail/SendGrid)│               │  Inbox      │
└──────────────┘                    └──────────────────┘               └─────────────┘
```

**Email Flow:** Node generates 6-digit OTP → sends HTML email via SMTP → user reads code → enters in UI → validated server-side.

---

## Part 1: SMTP Email Setup

### Supported Providers

| Provider | SMTP Host | Port | Auth |
|----------|-----------|------|------|
| **Gmail** | smtp.gmail.com | 587 (STARTTLS) | App Password |
| **SendGrid** | smtp.sendgrid.net | 587 | API Key |
| **Amazon SES** | email-smtp.{region}.amazonaws.com | 587 | SMTP Credentials |
| **Outlook/Office365** | smtp.office365.com | 587 | OAuth or Password |
| **Mailgun** | smtp.mailgun.org | 587 | API Key |

### Environment Variables

```bash
export SMTP_ENABLED=true
export SMTP_HOST=smtp.gmail.com        # SMTP server hostname
export SMTP_PORT=587                   # 587 for STARTTLS, 465 for SSL
export SMTP_SECURE=false               # "true" for port 465 SSL only
export SMTP_USER=your-email@gmail.com  # Username or API key
export SMTP_PASSWORD=xxxx-xxxx-xxxx    # Password or API secret
export SMTP_FROM=noreply@tbo.com       # Sender "From" address
```

### Gmail Setup

1. Enable 2FA on your Google account
2. Generate an **App Password**: Google Account → Security → App Passwords → Mail
3. Use the 16-char app password as `SMTP_PASSWORD`

```bash
export SMTP_ENABLED=true
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_SECURE=false
export SMTP_USER=your-email@gmail.com
export SMTP_PASSWORD=abcd-efgh-ijkl-mnop
export SMTP_FROM=your-email@gmail.com
```

### SendGrid Setup

1. Create a SendGrid account and generate an API key
2. Use `apikey` as username and the API key as password

```bash
export SMTP_ENABLED=true
export SMTP_HOST=smtp.sendgrid.net
export SMTP_PORT=587
export SMTP_USER=apikey
export SMTP_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxxxxxx
export SMTP_FROM=noreply@yourdomain.com
```

### Verify SMTP Connection

```bash
# Start server — should log "[SMTP] Connected to smtp.gmail.com:587"
node server/server.mjs

# Test OTP delivery
curl -X POST http://localhost:5179/api/verification/request-otp \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"BK-2026-001","email":"recipient@example.com"}'

# Response includes emailDelivery: "smtp" (real) or "console" (mock)
```

### Email Template

The system sends a branded HTML email with:
- FraudShield header with TBO.com branding
- 6-digit OTP displayed in styled digit boxes
- 5-minute expiry warning
- Plain text fallback for email clients that don't render HTML

---

## Part 2: Asterisk IVR Setup

### Prerequisites

- **Asterisk 20+** (with PJSIP support)
- **SIP Trunk** from a VoIP provider for outbound calls
- **Network access** between Node.js server and Asterisk (port 8088 for ARI HTTP + WS, 5060 for SIP)

### Installation (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install asterisk asterisk-modules

asterisk -V
```

### Configuration

#### 1. Enable ARI (`/etc/asterisk/ari.conf`)

```ini
[general]
enabled = yes
pretty = yes
allowed_origins = *

[ariuser]
type = user
read_only = no
password = aripass
```

#### 2. Enable HTTP + WebSocket Server (`/etc/asterisk/http.conf`)

```ini
[general]
enabled = yes
bindaddr = 0.0.0.0
bindport = 8088
```

#### 3. Register Stasis Application (`/etc/asterisk/stasis.conf`)

```ini
[general]
enabled = yes

[fraud-verification]
type = stasis
```

#### 4. Copy Dialplan

```bash
sudo cp dialplan.conf /etc/asterisk/extensions.conf
sudo cp extensions.conf /etc/asterisk/pjsip.conf
```

#### 5. Create Audio Prompts

```bash
sudo mkdir -p /var/lib/asterisk/sounds/custom/

espeak "Please enter your 6-digit verification code followed by the pound key" \
  --stdout | sox - /var/lib/asterisk/sounds/custom/fraud-verify-prompt.wav

espeak "Verification successful. Thank you." \
  --stdout | sox - /var/lib/asterisk/sounds/custom/verification-success.wav

espeak "Invalid code. Please try again." \
  --stdout | sox - /var/lib/asterisk/sounds/custom/verification-failed.wav

espeak "Maximum attempts exceeded. Goodbye." \
  --stdout | sox - /var/lib/asterisk/sounds/custom/verification-max-attempts.wav

# Convert to Asterisk format
for f in /var/lib/asterisk/sounds/custom/*.wav; do
  sox "$f" -r 8000 -c 1 "${f%.wav}.ulaw" && rm "$f"
done
```

#### 6. Configure SIP Trunk

Edit `/etc/asterisk/pjsip.conf` with your VoIP provider credentials. See `extensions.conf` in this directory.

#### 7. Restart Asterisk

```bash
sudo systemctl restart asterisk
```

### Environment Variables (Node.js)

```bash
export ASTERISK_ENABLED=true
export ASTERISK_HOST=192.168.1.100   # Asterisk server IP
export ASTERISK_PORT=8088
export ASTERISK_USER=ariuser
export ASTERISK_PASSWORD=aripass
export ARI_APP_NAME=fraud-verification
```

### How the ARI Client Works (Production Mode)

When `ASTERISK_ENABLED=true`:

1. **Server startup** → `initAriConnection()` opens a persistent WebSocket to `ws://ASTERISK_HOST:8088/ari/events`
2. **Call originate** → `POST /ari/channels` with PJSIP endpoint and Stasis app
3. **StasisStart event** → Node answers the channel and plays prompt via `POST /ari/channels/{id}/play`
4. **ChannelDtmfReceived events** → Digits accumulated per-channel in a DTMF collector map
5. **6 digits collected** (or `#` pressed) → Verification callback invoked, success prompt played, channel hung up
6. **Connection resilience** → Auto-reconnects WebSocket every 5s on disconnect

### Testing

```bash
# Verify ARI is running
curl -s http://localhost:8088/ari/asterisk/info?api_key=ariuser:aripass | jq .

# Verify WebSocket
wscat -c "ws://localhost:8088/ari/events?api_key=ariuser:aripass&app=fraud-verification"

# Test call originate from Node
curl -X POST http://localhost:5179/api/verification/request-ivr \
  -H "Content-Type: application/json" \
  -d '{"bookingId": "BK-2026-001", "phone": "+919876543210"}'

# Monitor Asterisk console
sudo asterisk -rvvv
```

---

## Mock Mode (Default)

When `ASTERISK_ENABLED` and `SMTP_ENABLED` are not set (or `false`):

- **Email OTP**: OTP logged to server console + returned in API response as `_devOtp`
- **IVR Call**: Mock client simulates `ringing` → `answered` (3s) → `dtmf_collected` (8s) → `verified`

This is sufficient for demos, UI development, and hackathon presentations.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `[SMTP] Connection verification failed` | Check SMTP_HOST, SMTP_PORT, credentials |
| `emailDelivery: "console"` in response | SMTP_ENABLED not set or credentials missing |
| `Connection refused` on port 8088 | Check Asterisk `http.conf` enabled + bindaddr |
| `401 Unauthorized` on ARI calls | Verify `ari.conf` user/password match env vars |
| `[ARI-WS] Disconnected` looping | Asterisk not running or firewall blocking 8088 |
| No audio on call | Check codecs in pjsip.conf (`allow = ulaw`) |
| DTMF not detected | Use RFC 2833 DTMF (default for PJSIP) |
| Only 5 digits collected | Caller may be slow — `#` key also terminates input |
