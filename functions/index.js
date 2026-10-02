const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const { defineSecret } = require("firebase-functions/params");
const { HttpsError, onCall } = require("firebase-functions/v2/https");

admin.initializeApp();
const requisitionsDb = getFirestore(admin.app(), "chung-lee");
const postmarkOutboundToken = defineSecret("POSTMARK_OUTBOUND_TOKEN");

function readText(data, field, maxLength, required = false) {
  const value = data[field];
  if (value === undefined || value === null || value === "") {
    if (required) throw new HttpsError("invalid-argument", `${field} is required.`);
    return "";
  }
  if (typeof value !== "string" || value.trim().length > maxLength) {
    throw new HttpsError("invalid-argument", `${field} must be text of at most ${maxLength} characters.`);
  }
  const normalized = value.trim();
  if (required && !normalized) throw new HttpsError("invalid-argument", `${field} is required.`);
  return normalized;
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
}, async (request) => {
  const data = request.data;
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in before submitting a press communication.");
  }
  const allowedFields = [
    "companyName", "pressOfficer", "officerEmail", "phoneNumber",
    "pressReleaseUrl", "headline", "announcementType", "embargoDate",
    "summary", "notes",
  ];
  if (!data || typeof data !== "object" || Object.keys(data).some((field) => !allowedFields.includes(field))) {
    throw new HttpsError("invalid-argument", "The press submission contains invalid fields.");
  }
  const announcementTypes = ["Press release", "Media statement", "Interview request", "Spokesperson briefing", "Statement"];
  const submission = {
    companyName: readText(data, "companyName", 160, true),
    pressOfficer: readText(data, "pressOfficer", 120, true),
    officerEmail: readText(data, "officerEmail", 254, true),
    phoneNumber: readText(data, "phoneNumber", 40),
    pressReleaseUrl: readText(data, "pressReleaseUrl", 500, true),
    headline: readText(data, "headline", 200, true),
    announcementType: readText(data, "announcementType", 40, true),
    embargoDate: readText(data, "embargoDate", 10),
    summary: readText(data, "summary", 6000, true),
    notes: readText(data, "notes", 3000),
  };
  if (!announcementTypes.includes(submission.announcementType)) {
    throw new HttpsError("invalid-argument", "Select a valid announcement type.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submission.officerEmail)) {
    throw new HttpsError("invalid-argument", "Press officer email must be a valid email address.");
  }
  if (submission.embargoDate && !/^\d{4}-\d{2}-\d{2}$/.test(submission.embargoDate)) {
    throw new HttpsError("invalid-argument", "Embargo date must use YYYY-MM-DD format.");
  }
  let pressUrl;
  try {
    pressUrl = new URL(submission.pressReleaseUrl);
  } catch (err) {
    throw new HttpsError("invalid-argument", "Press release link must be a valid URL.");
  }
  if (!["http:", "https:"].includes(pressUrl.protocol)) {
    throw new HttpsError("invalid-argument", "Press release link must use HTTP or HTTPS.");
  }
  const submissionRef = requisitionsDb.collection("pressCommunications").doc();
  try {
    await submissionRef.create({
      ...submission,
      requesterUid: request.auth.uid,
      requesterName: String(request.auth.token.name || "Signed-in user").slice(0, 160),
      requesterEmail: String(request.auth.token.email || "").slice(0, 254),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error("Unable to save press communication:", err);
    throw new HttpsError("internal", "Unable to save your press submission. Please try again later.");
  }
  try {
    const postmark = require("postmark");
    const client = new postmark.ServerClient(postmarkOutboundToken.value());
    const rows = [
      ["Company", submission.companyName],
      ["Headline", submission.headline],
      ["Announcement type", submission.announcementType],
      ["Press or media officer", submission.pressOfficer],
      ["Officer email", submission.officerEmail],
      ["Phone number", submission.phoneNumber || "Not provided"],
      ["Original press release", submission.pressReleaseUrl],
      ["Embargo date", submission.embargoDate || "Not specified"],
      ["Key message", submission.summary],
      ["Additional notes", submission.notes || "Not provided"],
    ];
    await client.sendEmail({
      From: "admin-messages@ibrecruitment.com",
      To: "uk-hr-enquiries@ibrecruitment.com",
      ReplyTo: submission.officerEmail,
      Subject: `Press communication: ${submission.headline.replace(/[\r\n]+/g, " ").slice(0, 160)}`,
      HtmlBody: `<html><body><h1>New press and media submission</h1><table>${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</table></body></html>`,
      TextBody: rows.map(([label, value]) => `${label}:\n${value}`).join("\n\n"),
      MessageStream: "outbound",
    });
    return {ok: true, saved: true, notificationSent: true, submissionId: submissionRef.id};
  } catch (err) {
    console.error("Press communication saved but notification failed:", err);
    return {ok: true, saved: true, notificationSent: false, submissionId: submissionRef.id};
  }
});
