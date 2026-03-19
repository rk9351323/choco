// ============================================
//  CHOCO Payment Server — Cashfree Integration
// ============================================

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();

// ---------- Cashfree SDK Setup ----------
const { Cashfree } = require("cashfree-pg");

Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = Cashfree.Environment.SANDBOX; // Change to PRODUCTION when going live

// ---------- Express App ----------
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------- Helper: Generate Unique Order ID ----------
function generateOrderId() {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(6).toString("hex");
  return `CHOCO_${timestamp}_${randomPart}`;
}

// =============================================
//  POST /create-order
//  Creates a new Cashfree order and returns
//  the payment_session_id to the frontend.
// =============================================
app.post("/create-order", async (req, res) => {
  try {
    const { amount, customerName, customerEmail, customerPhone } = req.body;

    // Basic validation
    if (!amount || !customerName || !customerEmail || !customerPhone) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: amount, customerName, customerEmail, customerPhone",
      });
    }

    const orderId = generateOrderId();

    // Build Cashfree order request
    const orderRequest = {
      order_amount: parseFloat(amount),
      order_currency: "INR",
      order_id: orderId,
      customer_details: {
        customer_id: `cust_${crypto.randomBytes(4).toString("hex")}`,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
      },
      order_meta: {
        return_url: `http://localhost:${PORT}/payment-status?order_id={order_id}`,
      },
    };

    // Call Cashfree API
    const response = await Cashfree.PGCreateOrder("2023-08-01", orderRequest);

    console.log("✅ Order created successfully:");
    console.log(`   Order ID  : ${orderId}`);
    console.log(`   Amount    : ₹${amount}`);
    console.log(`   Customer  : ${customerName} (${customerEmail})`);

    return res.status(200).json({
      success: true,
      order_id: orderId,
      payment_session_id: response.data.payment_session_id,
    });
  } catch (error) {
    console.error("❌ Error creating order:", error?.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to create order. Check server logs for details.",
    });
  }
});

// =============================================
//  POST /webhook
//  Receives payment notifications from Cashfree.
//  Verifies the webhook signature for security.
// =============================================
app.post("/webhook", (req, res) => {
  try {
    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];
    const rawBody = JSON.stringify(req.body);

    // ---------- Verify Webhook Signature ----------
    if (signature && timestamp) {
      const signedPayload = timestamp + rawBody;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.CASHFREE_SECRET_KEY)
        .update(signedPayload)
        .digest("base64");

      if (signature !== expectedSignature) {
        console.warn("⚠️  Webhook signature mismatch — possibly tampered request.");
        return res.status(401).json({ message: "Invalid signature" });
      }
    }

    // ---------- Process Payment Event ----------
    const event = req.body;
    const paymentData = event?.data?.payment || {};
    const orderData = event?.data?.order || {};

    console.log("──────────────────────────────────");
    console.log("📩 Webhook Received");
    console.log(`   Event Type : ${event.type || "unknown"}`);
    console.log(`   Order ID   : ${orderData.order_id || "N/A"}`);
    console.log(`   Amount     : ₹${orderData.order_amount || "N/A"}`);

    if (event.type === "PAYMENT_SUCCESS_WEBHOOK") {
      console.log("✅ PAYMENT SUCCESS");
      console.log(`   Payment ID : ${paymentData.cf_payment_id || "N/A"}`);
      console.log(`   Method     : ${paymentData.payment_group || "N/A"}`);
      // TODO: Update your database order status to "PAID" here
    } else if (event.type === "PAYMENT_FAILED_WEBHOOK") {
      console.log("❌ PAYMENT FAILED");
      console.log(`   Reason     : ${paymentData.payment_message || "Unknown"}`);
      // TODO: Update your database order status to "FAILED" here
    } else {
      console.log(`ℹ️  Event type: ${event.type}`);
    }
    console.log("──────────────────────────────────");

    // Always respond 200 so Cashfree knows we received it
    return res.status(200).json({ message: "Webhook received" });
  } catch (error) {
    console.error("❌ Webhook processing error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// =============================================
//  GET /payment-status
//  Simple page for Cashfree's return_url redirect
// =============================================
app.get("/payment-status", async (req, res) => {
  const { order_id } = req.query;

  if (!order_id) {
    return res.send("<h1>Missing order ID</h1>");
  }

  try {
    const response = await Cashfree.PGOrderFetchPayments("2023-08-01", order_id);
    const payments = response.data;

    if (payments && payments.length > 0) {
      const latestPayment = payments[0];
      const status = latestPayment.payment_status;

      console.log(`🔍 Payment status check — Order: ${order_id}, Status: ${status}`);

      if (status === "SUCCESS") {
        return res.send(`
          <html>
          <head><title>Payment Successful</title></head>
          <body style="font-family:sans-serif;text-align:center;padding:80px;background:#1A0F0D;color:#FDFBF7;">
            <h1 style="color:#D4AF37;">✅ Payment Successful!</h1>
            <p>Order ID: <strong>${order_id}</strong></p>
            <p>Amount: ₹${latestPayment.payment_amount}</p>
            <p>Payment ID: ${latestPayment.cf_payment_id}</p>
            <br>
            <a href="/../../choco-luxury/index.html" style="color:#D4AF37;">← Back to CHOCO</a>
          </body>
          </html>
        `);
      }
    }

    return res.send(`
      <html>
      <head><title>Payment Status</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:80px;background:#1A0F0D;color:#FDFBF7;">
        <h1 style="color:#C5832F;">⏳ Payment Pending or Failed</h1>
        <p>Order ID: <strong>${order_id}</strong></p>
        <p>Please check your email for confirmation or try again.</p>
        <br>
        <a href="/../../choco-luxury/payment.html" style="color:#D4AF37;">← Try Again</a>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("❌ Error fetching payment status:", error?.response?.data || error.message);
    return res.send("<h1>Error checking payment status</h1>");
  }
});

// ---------- Health Check ----------
app.get("/", (req, res) => {
  res.json({
    status: "running",
    service: "CHOCO Payment Server",
    environment: "SANDBOX",
    endpoints: {
      createOrder: "POST /create-order",
      webhook: "POST /webhook",
      paymentStatus: "GET /payment-status?order_id=xxx",
    },
  });
});

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log("╔════════════════════════════════════════╗");
  console.log("║   🍫 CHOCO Payment Server Running     ║");
  console.log(`║   🌐 http://localhost:${PORT}             ║`);
  console.log("║   🏖️  Mode: SANDBOX                    ║");
  console.log("╚════════════════════════════════════════╝");
});
