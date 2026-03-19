# 🍫 CHOCO — Cashfree Payment Setup Guide

A step-by-step guide to set up the Cashfree payment integration for the CHOCO website.

---

## 1. Get Cashfree Sandbox Credentials

1. Go to [**Cashfree Merchant Dashboard**](https://merchant.cashfree.com/merchants/signup)
2. Sign up for a **free sandbox account**
3. After logging in, navigate to **Developers → API Keys**
4. Copy your **Sandbox App ID** and **Sandbox Secret Key**

---

## 2. Configure Environment Variables

```bash
cd server
copy .env.example .env
```

Open `server/.env` and replace the placeholder values:

```env
CASHFREE_APP_ID=your_actual_sandbox_app_id
CASHFREE_SECRET_KEY=your_actual_sandbox_secret_key
PORT=8080
```

> ⚠️ **Never commit `.env` to git!** It's already in `.gitignore`.

---

## 3. Install Dependencies

```bash
cd server
npm install
```

This installs: `express`, `cashfree-pg`, `dotenv`, `cors`

---

## 4. Start the Payment Server

```bash
cd server
npm start
```

You should see:

```
╔════════════════════════════════════════╗
║   🍫 CHOCO Payment Server Running     ║
║   🌐 http://localhost:8080             ║
║   🏖️  Mode: SANDBOX                    ║
╚════════════════════════════════════════╝
```

---

## 5. Open the Payment Page

Open `choco-luxury/payment.html` in your browser (or serve it via Live Server).

- Fill in name, email, phone, and amount
- Click **"Pay Securely"**
- The Cashfree checkout modal will open
- Use **[Cashfree test cards](https://docs.cashfree.com/docs/test-data)** to simulate payments

### Test Card Details (Sandbox)

| Field           | Value                |
|-----------------|----------------------|
| Card Number     | `4111 1111 1111 1111`|
| Expiry          | Any future date      |
| CVV             | `123`                |
| Name            | Any name             |
| OTP             | `123456`             |

---

## 6. Webhooks (Optional for Local Testing)

Cashfree sends payment notifications to your `/webhook` endpoint. For local testing:

### Using ngrok:
```bash
npx ngrok http 8080
```

Copy the `https://xxxxx.ngrok.io` URL and set it in the Cashfree dashboard:

1. Go to **Developers → Webhooks** in the Cashfree dashboard
2. Add webhook URL: `https://xxxxx.ngrok.io/webhook`
3. Select events: `PAYMENT_SUCCESS`, `PAYMENT_FAILED`

Your server will log webhook events in the terminal.

---

## Project Structure

```
CHOCO/
├── server/                    ← Backend (Node.js)
│   ├── server.js              ← Express server with API endpoints
│   ├── package.json           ← Dependencies
│   ├── .env.example           ← Env template (copy to .env)
│   ├── .env                   ← Your actual secrets (git-ignored)
│   └── .gitignore             ← Ignores node_modules & .env
│
├── choco-luxury/              ← Frontend
│   ├── payment.html           ← Checkout page with Cashfree SDK
│   ├── index.html             ← Main site (checkout button → payment.html)
│   └── ...
│
└── PAYMENT_SETUP.md           ← This file
```

---

## API Endpoints

| Method | Endpoint          | Description                          |
|--------|-------------------|--------------------------------------|
| POST   | `/create-order`   | Creates a Cashfree order, returns `payment_session_id` |
| POST   | `/webhook`        | Receives payment status from Cashfree |
| GET    | `/payment-status` | Redirect target after payment        |
| GET    | `/`               | Health check                         |

---

## Going to Production

When you're ready to go live:

1. Replace sandbox credentials with **production** keys in `.env`
2. In `server.js`, change:
   ```js
   Cashfree.XEnvironment = Cashfree.Environment.PRODUCTION;
   ```
3. In `payment.html`, change:
   ```js
   const cashfree = Cashfree({ mode: "production" });
   ```
4. Set up webhook URL to your deployed server's URL
5. Use HTTPS in production

---

## Troubleshooting

| Issue                         | Solution                                           |
|-------------------------------|----------------------------------------------------|
| "Failed to create order"      | Check your `CASHFREE_APP_ID` and `SECRET_KEY` in `.env` |
| CORS errors                   | Make sure the backend server is running on port 8080 |
| Checkout modal doesn't open   | Check browser console for JS errors                |
| Webhook not received          | Use ngrok and verify webhook URL in Cashfree dashboard |
