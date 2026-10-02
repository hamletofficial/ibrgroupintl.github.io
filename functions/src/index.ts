/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at
 * https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onCall} from "firebase-functions/v2/https";
import {onDocumentCreated} from "firebase-functions/v2/firestore";

import * as express from "express";
import * as admin from "firebase-admin";
import * as cookieParser from "cookie-parser";
import {existsSync, readFileSync} from "fs";
import {join} from "path";

setGlobalOptions({maxInstances: 10});
try {
  admin.initializeApp();
} catch {
  // Already initialized.
}

const app = express();
app.use(express.json());
app.use(cookieParser());

const SESSION_COOKIE_NAME = "session";
const SESSION_EXPIRES = 14 * 24 * 60 * 60 * 1000;

/**
 * Serves a file from the public directory with a mapped content type.
 * @param {express.Response} res Express response.
 * @param {string} filepath Relative public path.
 * @return {express.Response} Response result.
 */
function serveStatic(res: express.Response, filepath: string) {
  const root = join(__dirname, "..", "public");
  const full = join(root, filepath);

  if (!existsSync(full)) {
    return res.status(404).send("Not found");
  }

  const data = readFileSync(full);

  if (filepath.endsWith(".html")) {
    res.set("Content-Type", "text/html");
  } else if (filepath.endsWith(".js")) {
    res.set("Content-Type", "application/javascript");
  } else if (filepath.endsWith(".css")) {
    res.set("Content-Type", "text/css");
  } else if (filepath.endsWith(".png")) {
    res.set("Content-Type", "image/png");
  } else if (
    filepath.endsWith(".jpg") ||
    filepath.endsWith(".jpeg")
  ) {
    res.set("Content-Type", "image/jpeg");
  }

  return res.status(200).send(data);
}

app.post("/sessionLogin", async (req, res) => {
  const idToken = req.body && req.body.idToken;

  if (!idToken) {
    return res.status(400).json({error: "Missing idToken"});
  }

  try {
    const sessionCookie = await admin.auth().createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES,
    });
    const cookieDomain =
      process.env.COOKIE_DOMAIN || ".ibrecruitment.com";
    const options: express.CookieOptions = {
      maxAge: SESSION_EXPIRES,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      domain: cookieDomain,
    };

    res.cookie(SESSION_COOKIE_NAME, sessionCookie, options);
    return res.json({status: "success"});
  } catch (err) {
    logger.error("sessionLogin failed", err);
    return res.status(401).json({error: "UNAUTHORIZED"});
  }
});

app.post("/sessionLogout", (req, res) => {
  const cookieDomain =
    process.env.COOKIE_DOMAIN || ".ibrecruitment.com";

  res.clearCookie(SESSION_COOKIE_NAME, {
    path: "/",
    domain: cookieDomain,
  });

  return res.json({status: "logged_out"});
});

app.get("*", async (req, res) => {
  try {
    const sessionCookie =
      req.cookies && req.cookies[SESSION_COOKIE_NAME];
    const publicPaths = [
      "/login.html",
      "/firebase-config.js",
      "/firebase-config.json",
    ];

    if (!sessionCookie) {
      if (publicPaths.includes(req.path)) {
        const safePath = req.path.replace(/^\//, "") || "login.html";
        return serveStatic(res, safePath);
      }
      return res.redirect("/login.html");
    }

    const decoded = await admin
      .auth()
      .verifySessionCookie(sessionCookie, true)
      .catch(() => null);

    if (!decoded) {
      return res.redirect("/login.html");
    }

    let pathValue = req.path;
    if (pathValue === "/" || pathValue === "") {
      pathValue = "/index.html";
    }
    if (pathValue.startsWith("/")) {
      pathValue = pathValue.substring(1);
    }

    return serveStatic(res, pathValue || "index.html");
  } catch (err) {
    logger.error("auth proxy error", err);
    return res.redirect("/login.html");
  }
});

export const authProxy = onRequest(app);

// Initialize Stripe with the API key from environment variables
// Set via: firebase functions:config:set stripe.secret_key="sk_..."
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY || "");

const POSTMARK_SERVER_TOKEN = process.env.POSTMARK_SERVER_TOKEN || "";
const POSTMARK_FROM_EMAIL = process.env.POSTMARK_FROM_EMAIL || "notifications@ibrecruitment.com";
const POSTMARK_MESSAGE_STREAM = process.env.POSTMARK_MESSAGE_STREAM || "outbound";

function normalizeEmails(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((v) => String(v || "").trim())
      .filter((v) => v.includes("@"));
  }

  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.includes("@"));
  }

  return [];
}

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeHtmlEntities(value: string): string {
  return String(value || "")
    .replace(/&#(\d+);/g, (_match, dec) => {
      const codePoint = Number(dec);
      if (!Number.isFinite(codePoint)) return _match;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return _match;
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex) => {
      const codePoint = Number.parseInt(hex, 16);
      if (!Number.isFinite(codePoint)) return _match;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return _match;
      }
    })
    .replace(/&rsquo;/gi, "’")
    .replace(/&lsquo;/gi, "‘")
    .replace(/&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export const forwardInboxMessageToEmail = onDocumentCreated("messages/{messageId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  const messageId = event.params.messageId;
  const data = snap.data() || {};
  const messageRef = snap.ref;

  if (data.emailForwarded === true) return;

  if (!POSTMARK_SERVER_TOKEN) {
    logger.error("POSTMARK_SERVER_TOKEN is not configured.");
    await messageRef.set({
      emailForwarded: false,
      emailForwardError: "POSTMARK_SERVER_TOKEN is missing",
      emailForwardAttempts: admin.firestore.FieldValue.increment(1),
      emailForwardLastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
    return;
  }

  const recipientUid = String(data.recipientUid || "").trim();
  if (!recipientUid) {
    await messageRef.set({
      emailForwarded: false,
      emailForwardError: "Missing recipientUid",
      emailForwardAttempts: admin.firestore.FieldValue.increment(1),
      emailForwardLastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
    return;
  }

  let toEmail = "";
  try {
    const user = await admin.auth().getUser(recipientUid);
    toEmail = String(user.email || "").trim();
  } catch (err) {
    logger.error("Unable to resolve recipient auth user", {messageId, recipientUid, err});
  }

  if (!toEmail) {
    toEmail = String(data.recipientLoginEmail || data.recipientEmail || "").trim();
  }

  if (!toEmail || !toEmail.includes("@")) {
    await messageRef.set({
      emailForwarded: false,
      emailForwardError: "Recipient email unavailable",
      emailForwardAttempts: admin.firestore.FieldValue.increment(1),
      emailForwardLastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
    return;
  }

  const ccList = normalizeEmails(data.cc || data.ccEmail || data.ccEmails)
    .filter((email) => email.toLowerCase() !== toEmail.toLowerCase());

  const subject = decodeHtmlEntities(String(data.subject || "New secure inbox message")).trim() || "New secure inbox message";
  const body = decodeHtmlEntities(String(data.body || data.message || "")).trim();
  const senderEmail = String(data.senderEmail || data.fromEmail || "admin-messages@ibrecruitment.com").trim();

  const textBody =
    "You have received a new secure inbox message in Impact in Business Recruitment.\n\n" +
    "From: " + senderEmail + "\n" +
    "Subject: " + subject + "\n" +
    (ccList.length ? ("Cc: " + ccList.join(", ") + "\n") : "") +
    "\n" + body + "\n\n" +
    "Please sign in to your secure messages inbox for full context.";

  const htmlBody =
    "<p>You have received a new secure inbox message in Impact in Business Recruitment.</p>" +
    "<p><strong>From:</strong> " + htmlEscape(senderEmail) + "<br/>" +
    "<strong>Subject:</strong> " + htmlEscape(subject) + "</p>" +
    "<p>" + htmlEscape(body).replace(/\n/g, "<br/>") + "</p>" +
    "<p>Please sign in to your secure messages inbox for full context.</p>";

  const payload: Record<string, string> = {
    From: POSTMARK_FROM_EMAIL,
    To: toEmail,
    Subject: subject,
    TextBody: textBody,
    HtmlBody: htmlBody,
    MessageStream: POSTMARK_MESSAGE_STREAM,
  };

  if (ccList.length) {
    payload.Cc = ccList.join(",");
  }

  try {
    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error("Postmark send failed: " + response.status + " " + responseText);
    }

    let postmarkMessageId = "";
    try {
      const parsed = JSON.parse(responseText) as { MessageID?: string };
      postmarkMessageId = String(parsed.MessageID || "");
    } catch {
      postmarkMessageId = "";
    }

    await messageRef.set({
      emailForwarded: true,
      emailForwardedAt: admin.firestore.FieldValue.serverTimestamp(),
      emailForwardAttempts: admin.firestore.FieldValue.increment(1),
      emailForwardLastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
      emailForwardedTo: toEmail,
      emailForwardedCc: ccList,
      emailProvider: "postmark",
      emailProviderMessageId: postmarkMessageId,
      emailForwardError: admin.firestore.FieldValue.delete(),
    }, {merge: true});

    logger.info("Inbox message forwarded via Postmark", {
      messageId,
      toEmail,
      ccCount: ccList.length,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown Postmark error";
    logger.error("Failed to forward inbox message", {messageId, err: errorMessage});

    await messageRef.set({
      emailForwarded: false,
      emailForwardError: errorMessage.slice(0, 1500),
      emailForwardAttempts: admin.firestore.FieldValue.increment(1),
      emailForwardLastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
      emailProvider: "postmark",
    }, {merge: true});
  }
});

/**
 * Cloud Function to fetch subscriber type from Stripe by email
 * Call this function after user authentication to get their subscription status
 */
export const getSubscriberType = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    throw new Error("Unauthenticated request");
  }

  const userEmail = request.auth.token.email;
  if (!userEmail) {
    throw new Error("User email not found");
  }

  try {
    // Search for Stripe customer by email
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (!customers.data || customers.data.length === 0) {
      return {
        subscriberType: "none",
        status: "no_subscription",
      };
    }

    const customer = customers.data[0];

    // Retrieve customer's subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1,
    });

    if (!subscriptions.data || subscriptions.data.length === 0) {
      return {
        subscriberType: "none",
        status: "no_active_subscription",
      };
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0]?.price?.id;
    const productId = subscription.items.data[0]?.price?.product;

    // Determine subscriber type based on product/price
    // You can customize the logic here based on your product setup
    let subscriberType = "founding_subscriber"; // Default to founding_subscriber

    // Optional: Query product metadata to determine type
    if (productId) {
      const product = await stripe.products.retrieve(productId);
      if (product.metadata && product.metadata.subscriber_type) {
        subscriberType = product.metadata.subscriber_type;
      }
    }

    return {
      subscriberType: subscriberType,
      status: "active",
      subscriptionId: subscription.id,
      customerId: customer.id,
    };
  } catch (err) {
    logger.error("getSubscriberType error:", err);
    throw new Error("Failed to fetch subscriber type");
  }
});
