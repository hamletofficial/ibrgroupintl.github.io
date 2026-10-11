const https = require("https");
const admin = require("firebase-admin");
const {getFirestore} = require("firebase-admin/firestore");
const {defineSecret} = require("firebase-functions/params");
const {HttpsError, onCall} = require("firebase-functions/v2/https");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");

const postmarkOutboundToken = defineSecret("POSTMARK_OUTBOUND_TOKEN");
const linkedInClientSecret = defineSecret("LINKEDIN_CLIENT_SECRET");

function getPressDb() {
  try {
    admin.app();
  } catch (err) {
    admin.initializeApp();
  }
  return getFirestore(admin.app(), "chung-lee");
}

function readText(data, field, maxLength, required) {
  const value = data && data[field];
  if (value === undefined || value === null || value === "") {
    if (required) throw new HttpsError("invalid-argument", field + " is required.");
    return "";
  }
  if (typeof value !== "string" || value.trim().length > maxLength) {
    throw new HttpsError("invalid-argument", field + " is too long.");
  }
  return value.trim();
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
  })[character]);
}

function briefRows(submission) {
  return [
    ["Company", submission.companyName || ""],
    ["Headline", submission.headline || ""],
    ["Announcement type", submission.announcementType || ""],
    ["Press officer", submission.pressOfficer || ""],
    ["Officer email", submission.officerEmail || ""],
    ["Destination email", submission.destinationEmail || ""],
    ["Phone", submission.phoneNumber || "Not provided"],
    ["Press release", submission.pressReleaseUrl || ""],
    ["Embargo", submission.embargoDate || "Not specified"],
    ["Message", submission.summary || ""],
    ["Notes", submission.notes || "Not provided"],
    ["Submitted by", submission.requesterName || "Signed-in user"],
    ["Requester email", submission.requesterEmail || "Not available"],
  ];
}

function textBody(rows) {
  return rows.map(function(row) { return row[0] + ":\n" + row[1]; }).join("\n\n");
}

function sendPostmark(submission) {
  const rows = briefRows(submission);
  const body = textBody(rows);
  const recipients = [
    submission.destinationEmail || "support@ibrecruitment.com",
    submission.officerEmail,
  ].filter(Boolean).filter(function(v, i, a) { return a.indexOf(v) === i; });

  const payload = JSON.stringify({
    From: "admin-messages@ibrecruitment.com",
    To: recipients.join(","),
    ReplyTo: submission.officerEmail || undefined,
    Subject: "Press communication: " + String(submission.headline || "New brief").replace(/[\r\n]+/g, " ").slice(0, 160),
    TextBody: body,
    HtmlBody: "<p>" + escapeHtml(body).replace(/\n/g, "<br>") + "</p>",
    MessageStream: "outbound",
  });
  return new Promise(function(resolve, reject) {
    const req = https.request({
      hostname: "api.postmarkapp.com",
      path: "/email",
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": postmarkOutboundToken.value(),
        "Content-Length": Buffer.byteLength(payload),
      },
    }, function(res) {
      let responseBody = "";
      res.on("data", function(chunk) { responseBody += chunk; });
      res.on("end", function() {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(responseBody);
        else reject(new Error("Postmark " + res.statusCode + ": " + responseBody));
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

exports.submitPressCommunications = onCall({
  region: "us-central1",
  invoker: "public",
  cors: true,
  timeoutSeconds: 30,
  memory: "256MiB",
  secrets: [postmarkOutboundToken],
}, async function(request) {
  const data = request.data || {};
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before submitting a press communication.");
  const allowed = ["companyName", "pressOfficer", "officerEmail", "destinationEmail", "phoneNumber", "pressReleaseUrl", "headline", "announcementType", "embargoDate", "summary", "notes"];
  var unexpected = Object.keys(data).filter(function(field) { return allowed.indexOf(field) === -1; });
  if (unexpected.length) {
    throw new HttpsError("invalid-argument", "The press submission contains invalid fields: " + unexpected.join(", "));
  }
  const types = ["Press release", "Media statement", "Interview request", "Spokesperson briefing", "Statement"];
  const submission = {
    companyName: readText(data, "companyName", 160, true),
    pressOfficer: readText(data, "pressOfficer", 120, true),
    officerEmail: readText(data, "officerEmail", 254, true),
    destinationEmail: readText(data, "destinationEmail", 254, true),
    phoneNumber: readText(data, "phoneNumber", 40, false),
    pressReleaseUrl: readText(data, "pressReleaseUrl", 500, true),
    headline: readText(data, "headline", 200, true),
    announcementType: readText(data, "announcementType", 40, true),
    embargoDate: readText(data, "embargoDate", 10, false),
    summary: readText(data, "summary", 6000, true),
    notes: readText(data, "notes", 3000, false),
  };
  if (types.indexOf(submission.announcementType) === -1) throw new HttpsError("invalid-argument", "Select a valid announcement type.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submission.officerEmail)) throw new HttpsError("invalid-argument", "Press officer email must be valid.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submission.destinationEmail)) throw new HttpsError("invalid-argument", "Destination email must be valid.");
  let pressUrl;
  try { pressUrl = new URL(submission.pressReleaseUrl); } catch (err) { throw new HttpsError("invalid-argument", "Press release link must be a valid URL."); }
  if (pressUrl.protocol !== "http:" && pressUrl.protocol !== "https:") throw new HttpsError("invalid-argument", "Press release link must use HTTP or HTTPS.");
  const saved = Object.assign({}, submission, {
    requesterUid: request.auth.uid,
    requesterName: String(request.auth.token.name || "Signed-in user").slice(0, 160),
    requesterEmail: String(request.auth.token.email || "").slice(0, 254),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    notificationHandledByCallable: true,
    notificationSent: false,
  });
  let ref;
  try {
    ref = getPressDb().collection("pressCommunications").doc();
    await ref.create(saved);
  } catch (err) {
    console.error("Unable to save press communication:", err);
    throw new HttpsError("failed-precondition", "The brief could not be saved: " + (err.message || err));
  }
  try {
    await sendPostmark(saved);
  } catch (err) {
    console.error("Unable to send press communication notification through Postmark:", err);
    throw new HttpsError("internal", "The brief was saved, but the support notification could not be sent: " + (err.message || err), {saved: true, submissionId: ref.id});
  }
  try {
    await ref.set({notificationSent: true, notifiedAt: admin.firestore.FieldValue.serverTimestamp()}, {merge: true});
  } catch (err) {
    console.error("Press notification was sent, but the sent flag could not be saved:", err);
  }
  return {ok: true, saved: true, notified: true, submissionId: ref.id};
});

exports.getPressCommunications = onCall({
  region: "us-central1",
  invoker: "public",
  cors: true,
}, async function(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before viewing your archive.");
  try {
    const snapshot = await getPressDb().collection("pressCommunications")
      .where("requesterUid", "==", request.auth.uid)
      .get();
    const briefs = snapshot.docs.map(function(doc) {
      const data = doc.data() || {};
      return Object.assign({}, data, {
        id: doc.id,
        createdAt: data.createdAt && data.createdAt.toMillis ? data.createdAt.toMillis() : null,
        notifiedAt: data.notifiedAt && data.notifiedAt.toMillis ? data.notifiedAt.toMillis() : null
      });
    }).sort(function(a, b) {
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return {ok: true, briefs: briefs};
  } catch (err) {
    console.error("Unable to retrieve press communications archive:", err);
    throw new HttpsError("internal", "The archive could not be loaded.");
  }
});

exports.deletePressCommunications = onCall({
  region: "us-central1",
  invoker: "public",
  cors: true,
}, async function(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in before deleting a brief.");
  }

  const ids = request.data && Array.isArray(request.data.ids) ? request.data.ids : [];
  const uniqueIds = Array.from(new Set(ids.filter(function(id) {
    return typeof id === "string" && id.trim().length > 0 && id.length <= 200;
  })));

  if (!uniqueIds.length) {
    throw new HttpsError("invalid-argument", "Select at least one brief to delete.");
  }
  if (uniqueIds.length > 20) {
    throw new HttpsError("invalid-argument", "You can delete a maximum of 20 briefs at once.");
  }

  const db = getPressDb();
  let deleted = 0;

  try {
    for (const id of uniqueIds) {
      const ref = db.collection("pressCommunications").doc(id);
      const snapshot = await ref.get();

      if (!snapshot.exists) continue;

      const data = snapshot.data() || {};
      if (data.requesterUid !== request.auth.uid) {
        throw new HttpsError("permission-denied", "You can only delete briefs belonging to your account.");
      }

      await ref.delete();
      deleted++;
    }

    return {ok: true, deleted: deleted};
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    console.error("Unable to delete press communication archive records:", err);
    throw new HttpsError("internal", "The selected brief(s) could not be deleted.");
  }
});

exports.sendPressCommunicationEmail = onDocumentCreated({
  document: "pressCommunications/{submissionId}",
  database: "chung-lee",
  region: "us-central1",
  secrets: [postmarkOutboundToken],
  timeoutSeconds: 30,
  memory: "256MiB",
}, async function(event) {
  const snap = event.data;
  if (!snap) return;
  const submission = snap.data() || {};
  if (submission.notificationSent || submission.notificationHandledByCallable) return;
  await sendPostmark(submission);
  await snap.ref.set({notificationSent: true, notifiedAt: admin.firestore.FieldValue.serverTimestamp()}, {merge: true});
});

exports.retryPressCommunicationEmail = onSchedule({
  schedule: "every 5 minutes",
  region: "us-central1",
  secrets: [postmarkOutboundToken],
  timeoutSeconds: 60,
  memory: "256MiB",
}, async function() {
  const pending = await getPressDb().collection("pressCommunications").where("notificationSent", "==", false).limit(20).get();
  for (const doc of pending.docs) {
    const submission = doc.data() || {};
    const createdAt = submission.createdAt && submission.createdAt.toMillis ? submission.createdAt.toMillis() : Date.now();
    if (Date.now() - createdAt > 15 * 60 * 1000) {
      console.error("Press notification still unsent after 15 minutes:", doc.id);
    }
    try {
      await sendPostmark(submission);
      await doc.ref.set({notificationSent: true, notifiedAt: admin.firestore.FieldValue.serverTimestamp()}, {merge: true});
    } catch (err) {
      console.error("Retry could not send press notification:", doc.id, err);
    }
  }
});

function sendDirectMessageNotification(recipientEmail, recipientName) {
  const safeName = String(recipientName || "there").replace(/[\r\n]+/g, " ").slice(0, 120);
  const messageUrl = "https://uk.ibrecruitment.com/messages.html";
  const text = "Hello " + safeName + ",\n\nYou have received a new direct message on the IBR broker community platform. Sign in to read and reply:\n" + messageUrl + "\n\nFor your privacy, the message content is not included in this email.";
  const payload = JSON.stringify({
    From: "admin-messages@ibrecruitment.com",
    To: recipientEmail,
    Subject: "You have a new message on IBR",
    TextBody: text,
    HtmlBody: "<p>Hello " + escapeHtml(safeName) + ",</p><p>You have received a new direct message on the IBR broker community platform. Sign in to read and reply:</p><p><a href=\"" + messageUrl + "\">Open your IBR inbox</a></p><p>For your privacy, the message content is not included in this email.</p>",
    MessageStream: "outbound",
  });
  return new Promise(function(resolve, reject) {
    const req = https.request({
      hostname: "api.postmarkapp.com",
      path: "/email",
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": postmarkOutboundToken.value(),
        "Content-Length": Buffer.byteLength(payload),
      },
    }, function(res) {
      let responseBody = "";
      res.on("data", function(chunk) { responseBody += chunk; });
      res.on("end", function() {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(responseBody);
        else reject(new Error("Postmark " + res.statusCode + ": " + responseBody));
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

exports.notifyDirectMessageRecipient = onDocumentCreated({
  document: "directMessages/{messageId}",
  region: "us-central1",
  secrets: [postmarkOutboundToken],
  timeoutSeconds: 30,
  memory: "256MiB",
}, async function(event) {
  const snap = event.data;
  if (!snap) return;
  const message = snap.data() || {};
  const recipientUid = message.recipientUid;
  const senderUid = message.senderUid;
  if (typeof recipientUid !== "string" || !recipientUid || recipientUid === senderUid) return;

  try {
    try { admin.app(); } catch (err) { admin.initializeApp(); }

    // Claim this notification transactionally so duplicate Firestore event
    // deliveries do not normally send the same email more than once.
    const db = getFirestore(admin.app());
    const now = Date.now();
    const claim = await db.runTransaction(async function(transaction) {
      const fresh = await transaction.get(snap.ref);
      if (!fresh.exists) return false;
      const data = fresh.data() || {};
      if (data.emailNotificationStatus === "sent") return false;
      const processingAt = data.emailNotificationProcessingAt &&
        typeof data.emailNotificationProcessingAt.toMillis === "function" ?
        data.emailNotificationProcessingAt.toMillis() : 0;
      if (data.emailNotificationStatus === "processing" &&
          processingAt > 0 && now - processingAt < 10 * 60 * 1000) return false;
      transaction.set(snap.ref, {
        emailNotificationStatus: "processing",
        emailNotificationProcessingAt: admin.firestore.FieldValue.serverTimestamp(),
        emailNotificationAttempts: admin.firestore.FieldValue.increment(1),
      }, {merge: true});
      return true;
    });
    if (!claim) {
      console.log("Direct-message notification already sent or currently processing:", snap.id);
      return;
    }

    // Use the email address explicitly stored in the member's Firestore profile.
    // Do not silently substitute Firebase Authentication's email: profile email is
    // the mailbox notification destination requested by the application.
    const profileSnap = await getFirestore(admin.app()).collection("publicProfiles").doc(recipientUid).get();
    const profile = profileSnap.exists ? (profileSnap.data() || {}) : {};
    const recipientEmail = typeof profile.email === "string" ? profile.email.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      console.warn("Direct-message notification skipped because the recipient has no valid email in publicProfiles:", recipientUid);
      await snap.ref.set({
        emailNotificationStatus: "skipped",
        emailNotificationReason: "missing-firestore-profile-email",
        emailNotificationCheckedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
      return;
    }
    const recipientName = [profile.firstName, profile.lastName].filter(function(part) {
      return typeof part === "string" && part.trim();
    }).join(" ").trim() || "there";
    await sendDirectMessageNotification(recipientEmail, recipientName);
    await snap.ref.set({
      emailNotificationStatus: "sent",
      emailNotificationSentAt: admin.firestore.FieldValue.serverTimestamp(),
      emailNotificationError: admin.firestore.FieldValue.delete(),
    }, {merge: true});
  } catch (err) {
    console.error("Unable to send direct-message email notification:", snap.id, err);
    try {
      await snap.ref.set({
        emailNotificationStatus: "failed",
        emailNotificationFailedAt: admin.firestore.FieldValue.serverTimestamp(),
        emailNotificationError: String(err && err.message || err).slice(0, 500),
      }, {merge: true});
    } catch (updateErr) {
      console.error("Unable to record direct-message notification failure:", snap.id, updateErr);
    }
  }
});

exports.exchangeLinkedInAuth = onCall({
  region: "us-central1",
  invoker: "public",
  cors: true,
  secrets: [linkedInClientSecret],
}, async function(request) {
  try {
    const code = request.data && request.data.code;
    const clientId = request.data && request.data.clientId;
    const redirectUri = request.data && request.data.redirectUri;
    if (!code || !clientId || !redirectUri) throw new HttpsError("invalid-argument", "LinkedIn sign-in is missing the authorization code.");
    if (clientId === "LINKEDIN_CLIENT_ID" || clientId === "REPLACE_WITH_LINKEDIN_CLIENT_ID") {
      throw new HttpsError("failed-precondition", "Set the LinkedIn client ID before using LinkedIn sign-in.");
    }
    let clientSecret = "";
    try { clientSecret = linkedInClientSecret.value(); } catch (err) {
      throw new HttpsError("failed-precondition", "LINKEDIN_CLIENT_SECRET is not available to exchangeLinkedInAuth.");
    }
    if (!clientSecret) throw new HttpsError("failed-precondition", "LINKEDIN_CLIENT_SECRET is empty.");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });
    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: {"Content-Type": "application/x-www-form-urlencoded"},
      body: body.toString(),
    });
    const tokenText = await tokenResponse.text();
    let tokenJson = {};
    try { tokenJson = JSON.parse(tokenText); } catch (err) { tokenJson = {error: tokenText.slice(0, 300)}; }
    if (!tokenResponse.ok) {
      const reason = tokenJson.error_description || tokenJson.error || "LinkedIn token exchange failed.";
      throw new HttpsError("unauthenticated", "LinkedIn token exchange failed: " + reason);
    }
    const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {Authorization: "Bearer " + tokenJson.access_token},
    });
    const profileText = await profileResponse.text();
    let profile = {};
    try { profile = JSON.parse(profileText); } catch (err) { profile = {}; }
    if (!profileResponse.ok || !profile.sub) {
      throw new HttpsError("unauthenticated", "LinkedIn profile could not be read: " + (profile.message || profileText.slice(0, 180)));
    }
    if (!tokenJson.id_token) {
      throw new HttpsError("failed-precondition", "LinkedIn did not return an ID token. Enable Sign In with LinkedIn using OpenID Connect and request the openid scope.");
    }
    return {idToken: tokenJson.id_token, accessToken: tokenJson.access_token || "", email: profile.email || "", name: profile.name || "", picture: profile.picture || ""};
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    console.error("exchangeLinkedInAuth failed", err);
    throw new HttpsError("internal", (err && err.message) || "LinkedIn sign-in failed.");
  }
});


// Hamlet: deliver critical-path emails independently of an open browser session.
// The browser stores each reminder under hamletReminders; this scheduled function
// runs against the project's default Firestore database and uses the existing
// POSTMARK_OUTBOUND_TOKEN secret.
function hamletLondonDateKey(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }
  return values.year + "-" + values.month + "-" + values.day;
}

function hamletShiftIsoDate(dateString, daysBack) {
  const date = new Date(dateString + "T12:00:00.000Z");
  date.setUTCDate(date.getUTCDate() - daysBack);
  return date.toISOString().slice(0, 10);
}

function sendHamletReminderEmail(recipients, reminder, deal, dueDate, brokerEmail) {
  const safeTitle = String(reminder.title || "Critical-path deadline").replace(/[\r\n]+/g, " ").slice(0, 140);
  const safeDealName = String(deal && deal.name || "General deadline").replace(/[\r\n]+/g, " ").slice(0, 160);
  const safeProperty = String(deal && deal.property || "").replace(/[\r\n]+/g, " ").slice(0, 180);
  const safeClient = String(deal && deal.client || "").replace(/[\r\n]+/g, " ").slice(0, 140);
  const dueLabel = new Date(dueDate + "T12:00:00.000Z").toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const reminderLead = Math.max(0, Math.min(30, Number(reminder.leadDays) || 0));
  const leadLabel = reminderLead === 0 ? "on the due date" : reminderLead + " day" + (reminderLead === 1 ? "" : "s") + " before the due date";
  const workspaceUrl = "https://uk.ibrecruitment.com/app/hamlet/index.html";
  const lines = [
    "Hamlet critical-path reminder",
    "",
    "Deadline: " + safeTitle,
    "Due date: " + dueLabel,
    "Reminder timing: " + leadLabel,
    "Deal: " + safeDealName,
    safeProperty ? "Property: " + safeProperty : "",
    safeClient ? "Client / counterparty: " + safeClient : "",
    "",
    "Please review the milestone and any dependencies in Hamlet:",
    workspaceUrl,
    "",
    "This is an automated reminder from Hamlet, the IBR commercial real estate deal workspace.",
  ].filter(function(line) { return line !== undefined; });
  const textBodyValue = lines.join("\n");
  const htmlBodyValue = "<p>Hamlet critical-path reminder</p>" +
    "<p><strong>Deadline:</strong> " + escapeHtml(safeTitle) + "<br>" +
    "<strong>Due date:</strong> " + escapeHtml(dueLabel) + "<br>" +
    "<strong>Reminder timing:</strong> " + escapeHtml(leadLabel) + "<br>" +
    "<strong>Deal:</strong> " + escapeHtml(safeDealName) +
    (safeProperty ? "<br><strong>Property:</strong> " + escapeHtml(safeProperty) : "") +
    (safeClient ? "<br><strong>Client / counterparty:</strong> " + escapeHtml(safeClient) : "") +
    "</p><p>Please review the milestone and its dependencies in <a href=\"" + workspaceUrl + "\">Hamlet</a>.</p>" +
    "<p>This is an automated reminder from Hamlet, the IBR commercial real estate deal workspace.</p>";
  const payload = JSON.stringify({
    From: "admin-messages@ibrecruitment.com",
    To: recipients.join(","),
    ReplyTo: brokerEmail || undefined,
    Subject: "Hamlet deadline reminder: " + safeTitle + " — due " + dueLabel,
    TextBody: textBodyValue,
    HtmlBody: htmlBodyValue,
    MessageStream: "outbound",
  });
  return new Promise(function(resolve, reject) {
    const req = https.request({
      hostname: "api.postmarkapp.com",
      path: "/email",
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": postmarkOutboundToken.value(),
        "Content-Length": Buffer.byteLength(payload),
      },
    }, function(res) {
      let responseBody = "";
      res.on("data", function(chunk) { responseBody += chunk; });
      res.on("end", function() {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(responseBody);
        else reject(new Error("Postmark " + res.statusCode + ": " + responseBody));
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

exports.sendHamletCriticalPathReminders = onSchedule({
  schedule: "0 8 * * *",
  timeZone: "Europe/London",
  region: "us-central1",
  secrets: [postmarkOutboundToken],
  timeoutSeconds: 540,
  memory: "512MiB",
}, async function() {
  try { admin.app(); } catch (err) { admin.initializeApp(); }
  const db = getFirestore(admin.app());
  const todayKey = hamletLondonDateKey(new Date());
  const snapshot = await db.collection("hamletReminders").get();
  const brokerEmailCache = new Map();
  let sentCount = 0;

  async function getBrokerEmail(uid) {
    if (brokerEmailCache.has(uid)) return brokerEmailCache.get(uid);
    let email = "";
    try {
      const account = await admin.auth().getUser(uid);
      if (account && typeof account.email === "string") email = account.email.trim();
    } catch (err) {
      console.warn("Hamlet reminder could not read the account email for UID:", uid, err && err.message);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      try {
        const profileSnap = await db.collection("publicProfiles").doc(uid).get();
        const profile = profileSnap.exists ? (profileSnap.data() || {}) : {};
        if (typeof profile.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
          email = profile.email.trim();
        }
      } catch (err) {
        console.warn("Hamlet reminder could not read the profile email for UID:", uid, err && err.message);
      }
    }
    brokerEmailCache.set(uid, email);
    return email;
  }

  for (const doc of snapshot.docs) {
    const reminder = doc.data() || {};
    if (reminder.done === true || reminder.demo === true) continue;
    const uid = typeof reminder.uid === "string" ? reminder.uid : "";
    const dueDate = typeof reminder.dueDate === "string" ? reminder.dueDate : "";
    if (!uid || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dueDate)) continue;
    const rawLead = Number(reminder.leadDays);
    const leadDays = Number.isFinite(rawLead) ? Math.max(0, Math.min(30, Math.floor(rawLead))) : 0;
    const firstReminderDate = hamletShiftIsoDate(dueDate, leadDays);
    // Catch up on a missed reminder after a deployment/outage, but never send
    // a new message after the contractual milestone has already passed.
    if (todayKey < firstReminderDate || todayKey > dueDate) continue;

    const deliveryId = (doc.id + "_" + dueDate).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180);
    const deliveryRef = db.collection("hamletReminderDeliveries").doc(deliveryId);
    let deliverySnap;
    try { deliverySnap = await deliveryRef.get(); }
    catch (err) { console.error("Hamlet could not check reminder delivery status:", doc.id, err); continue; }
    const delivery = deliverySnap.exists ? (deliverySnap.data() || {}) : {};
    if (delivery.status === "sent" || delivery.status === "skipped") continue;
    if (delivery.status === "processing" && delivery.processingAt &&
        typeof delivery.processingAt.toMillis === "function" &&
        Date.now() - delivery.processingAt.toMillis() < 10 * 60 * 1000) continue;

    const brokerEmail = await getBrokerEmail(uid);
    const extraEmail = typeof reminder.email === "string" ? reminder.email.trim() : "";
    const recipients = Array.from(new Set([brokerEmail, extraEmail]
      .filter(function(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); })
      .map(function(value) { return value.toLowerCase(); })));

    if (!recipients.length) {
      await deliveryRef.set({
        reminderId: doc.id, ownerUid: uid, dueDate: dueDate, status: "skipped",
        reason: "No valid broker or additional-recipient email address was available.",
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
      continue;
    }

    let deal = null;
    const dealId = typeof reminder.dealId === "string" ? reminder.dealId : "";
    if (dealId && dealId.length <= 200) {
      try {
        const dealSnap = await db.collection("hamletDeals").doc(dealId).get();
        if (dealSnap.exists && (dealSnap.data() || {}).uid === uid) deal = dealSnap.data() || {};
      } catch (err) {
        console.warn("Hamlet reminder could not load linked deal details:", dealId, err && err.message);
      }
    }
    if (deal && deal.stage === "Closed") continue;

    await deliveryRef.set({
      reminderId: doc.id, ownerUid: uid, dueDate: dueDate, status: "processing",
      processingAt: admin.firestore.FieldValue.serverTimestamp(),
      attempts: admin.firestore.FieldValue.increment(1),
      recipients: recipients,
    }, {merge: true});

    try {
      await sendHamletReminderEmail(recipients, reminder, deal, dueDate, brokerEmail);
      await deliveryRef.set({
        status: "sent",
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        error: admin.firestore.FieldValue.delete(),
      }, {merge: true});
      sentCount++;
      console.log("Hamlet critical-path reminder email sent:", doc.id, recipients.length);
    } catch (err) {
      console.error("Hamlet reminder email failed and will be retried while the deadline is live:", doc.id, err);
      await deliveryRef.set({
        status: "failed",
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
        error: String(err && err.message || err).slice(0, 500),
      }, {merge: true});
    }
  }
  console.log("Hamlet critical-path reminder job completed:", {date: todayKey, remindersScanned: snapshot.size, emailsSent: sentCount});
});
