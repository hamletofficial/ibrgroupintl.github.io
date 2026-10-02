const https = require("https");
const admin = require("firebase-admin");
const {getFirestore} = require("firebase-admin/firestore");
const {defineSecret} = require("firebase-functions/params");
const {HttpsError, onCall} = require("firebase-functions/v2/https");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");

if (!admin.apps.length) admin.initializeApp();
const pressDb = getFirestore(admin.app(), "chung-lee");
const postmarkOutboundToken = defineSecret("POSTMARK_OUTBOUND_TOKEN");

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
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&",
    "<": "<",
    ">": ">",
    "'": "&#39;",
  })[character]);
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
  const allowed = ["companyName", "pressOfficer", "officerEmail", "phoneNumber", "pressReleaseUrl", "headline", "announcementType", "embargoDate", "summary", "notes"];
  if (Object.keys(data).some(function(field) { return allowed.indexOf(field) === -1; })) {
    throw new HttpsError("invalid-argument", "The press submission contains invalid fields.");
  }
  const types = ["Press release", "Media statement", "Interview request", "Spokesperson briefing", "Statement"];
  const submission = {
    companyName: readText(data, "companyName", 160, true),
    pressOfficer: readText(data, "pressOfficer", 120, true),
    officerEmail: readText(data, "officerEmail", 254, true),
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
  let pressUrl;
  try { pressUrl = new URL(submission.pressReleaseUrl); } catch (err) { throw new HttpsError("invalid-argument", "Press release link must be a valid URL."); }
  if (pressUrl.protocol !== "http:" && pressUrl.protocol !== "https:") throw new HttpsError("invalid-argument", "Press release link must use HTTP or HTTPS.");
  const ref = pressDb.collection("pressCommunications").doc();
  await ref.create(Object.assign({}, submission, {
    requesterUid: request.auth.uid,
    requesterName: String(request.auth.token.name || "Signed-in user").slice(0, 160),
    requesterEmail: String(request.auth.token.email || "").slice(0, 254),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }));
  return {ok: true, saved: true, submissionId: ref.id};
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
  const rows = [
    ["Company", submission.companyName || ""],
    ["Headline", submission.headline || ""],
    ["Announcement type", submission.announcementType || ""],
    ["Press officer", submission.pressOfficer || ""],
    ["Officer email", submission.officerEmail || ""],
    ["Phone", submission.phoneNumber || "Not provided"],
    ["Press release", submission.pressReleaseUrl || ""],
    ["Embargo", submission.embargoDate || "Not specified"],
    ["Message", submission.summary || ""],
    ["Notes", submission.notes || "Not provided"],
  ];
  const payload = JSON.stringify({
    From: "admin-messages@ibrecruitment.com",
    To: "support@ibrecruitment.com",
    ReplyTo: submission.officerEmail || undefined,
    Subject: "Press communication: " + String(submission.headline || "New brief").slice(0, 160),
    TextBody: textBody(rows),
    HtmlBody: "<p>" + textBody(rows).replace(/\n/g, "<br>") + "</p>",
    MessageStream: "outbound",
  });
  await new Promise(function(resolve, reject) {
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
      let body = "";
      res.on("data", function(chunk) { body += chunk; });
      res.on("end", function() {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(body);
        else reject(new Error("Postmark " + res.statusCode + ": " + body));
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
  await snap.ref.set({notificationSent: true, notifiedAt: admin.firestore.FieldValue.serverTimestamp()}, {merge: true});
});
