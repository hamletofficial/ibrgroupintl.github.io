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
    try { admin.app(); } catch (err) { admin.initializeApp(); }
    let token;
    try {
      token = await admin.auth().createCustomToken("linkedin:" + profile.sub, {email: profile.email || "", name: profile.name || ""});
    } catch (err) {
      console.error("createCustomToken failed", err);
      throw new HttpsError("failed-precondition", "Firebase could not mint a custom token. Grant the function service account Service Account Token Creator (roles/iam.serviceAccountTokenCreator).");
    }
    return {token: token, email: profile.email || "", name: profile.name || ""};
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    console.error("exchangeLinkedInAuth failed", err);
    throw new HttpsError("internal", (err && err.message) || "LinkedIn sign-in failed.");
  }
});
