/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

    for (const entry of feed.items) {
      // Use a deterministic ID (e.g., GUID or link) to avoid duplicates
      const docId = Buffer.from(entry.guid || entry.link).toString('base64').replace(/\//g, '_');
      const docRef = db.collection('insightsFeed').doc(docId);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        batch.set(docRef, {
          title: entry.title || '',
          snippet: entry.contentSnippet || entry.summary || '',
          link: entry.link || '',
          timestamp: entry.isoDate ? new Date(entry.isoDate).getTime() : Date.now(),
          notified: false,
          test: false,
          rssSource: 'substack',
          guid: entry.guid || entry.link || '',
        });
        newCount++;
      }
    }
    if (newCount > 0) await batch.commit();
    return { inserted: newCount };
});


exports.relayInsightOnCreate = onDocumentCreated({
  document: 'insightsFeed/{postId}',
  secrets: [postmarkToken],
}, async (event) => {
    const snap = event.data;
    if (!snap) return null;
    const post = snap.data();
    const postRef = snap.ref;
    // Get the secret value at runtime
    const postmark = require('postmark');
    const postmarkClient = new postmark.ServerClient(postmarkToken.value());

    // 1. Idempotency: Check if already notified
    if (post.notified) return null;

    // 2 & 4. Time limit and test/old data filtering
    const now = Date.now();
    const postTime = post.timestamp || now;
    const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours
    if ((now - postTime) > maxAgeMs) return null;
    if (post.test) return null;


    // 6. Unsubscribe/Opt-Out Logic
    let usersSnap;
    try {
      usersSnap = await admin.firestore().collection('publicProfiles').get();
    } catch (err) {
      console.error('Error fetching users:', err);
      return null;
    }
    const emails = [];
    usersSnap.forEach(doc => {
      const data = doc.data();
      if (data.email && !data.unsubscribed) emails.push(data.email);
    });
    if (emails.length === 0) return null;

    // HTML5 email template with unsubscribe link
    const htmlBody = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${post.title || 'New Premium Content'}</title>
      </head>
      <body style="font-family: 'Open Sans', Arial, sans-serif; color: #0f172a; background: #f5f9ff;">
        <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(2,6,23,0.08);padding:32px;">
          <h1 style="color:#0284c7;">${post.title || 'New Premium Content'}</h1>
          <p style="color:#475569;font-size:1.1rem;">${post.snippet || ''}</p>
          <a href="${post.link || '#'}" style="display:inline-block;margin:18px 0 0 0;padding:12px 24px;background:#0284c7;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;">Read More</a>
          <hr style="margin:32px 0 16px 0;border:none;border-top:1px solid #e5e7eb;">
          <div style="font-size:0.95rem;color:#475569;text-align:center;">
            You are receiving this email because you are a member of Impact in Business Recruitment.<br>
            <a href="https://www.ibrecruitment.com/unsubscribe?email={{email}}" style="color:#0284c7;text-decoration:underline;">Unsubscribe</a>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      for (let i = 0; i < emails.length; i += 50) {
        const batch = emails.slice(i, i + 50).map(email => ({
          From: 'admin-messages@ibrecruitment.com',
          To: email,
          Subject: `New Insight: ${post.title || 'Update from Impact in Business Recruitment'}`,
          HtmlBody: htmlBody.replace('{{email}}', encodeURIComponent(email)),
          TextBody: `${post.title || 'New Insight'}\n\n${post.snippet || ''}\n\nRead more: ${post.link || ''}\n\nUnsubscribe: https://www.ibrecruitment.com/unsubscribe?email=${encodeURIComponent(email)}`,
          MessageStream: 'broadcast'
        }));
        await postmarkClient.sendEmailBatch(batch);
      }
      // 1. Mark as notified
      await postRef.update({ notified: true });
    } catch (err) {
      console.error('Error sending emails or updating document:', err);
    }
    return null;
});
// --- End relayInsightOnCreate and dependencies ---

function readRequisitionText(data, field, maxLength, required = false) {
  const value = data[field];
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new HttpsError('invalid-argument', `${field} is required.`);
    }
    return '';
  }
  if (typeof value !== 'string' || value.trim().length > maxLength) {
    throw new HttpsError('invalid-argument', `${field} must be text of at most ${maxLength} characters.`);
  }
  const normalized = value.trim();
  if (required && !normalized) {
    throw new HttpsError('invalid-argument', `${field} is required.`);
  }
  return normalized;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

async function sendJobRequisitionOutboundNotification(email) {
  const postmark = require('postmark');
  const postmarkClient = new postmark.ServerClient(postmarkOutboundToken.value());
  await postmarkClient.sendEmail(email);
}

exports.submitJobRequisition = onCall({
  region: 'us-central1',
  invoker: 'public',
  cors: true,
  timeoutSeconds: 30,
  memory: '256MiB',
  secrets: [postmarkOutboundToken],
}, async (request) => {
    const data = request.data;
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in before submitting a job requisition.');
    }

    const allowedFields = [
      'jobTitle', 'department', 'hiringManager', 'workLocation', 'workplaceType',
      'employmentType', 'numberOfOpenings', 'targetStartDate', 'salaryRange',
      'urgency', 'budgetApproved', 'applicationUrl', 'jobDescription',
      'requirements', 'additionalNotes',
    ];
    if (!data || typeof data !== 'object' || Object.keys(data).some((field) => !allowedFields.includes(field))) {
      throw new HttpsError('invalid-argument', 'The requisition submission contains invalid fields.');
    }

    const requisition = {
      jobTitle: readRequisitionText(data, 'jobTitle', 160, true),
      department: readRequisitionText(data, 'department', 120, true),
      hiringManager: readRequisitionText(data, 'hiringManager', 120, true),
      workLocation: readRequisitionText(data, 'workLocation', 160, true),
      workplaceType: readRequisitionText(data, 'workplaceType', 20, true),
      employmentType: readRequisitionText(data, 'employmentType', 20, true),
      targetStartDate: readRequisitionText(data, 'targetStartDate', 10),
      salaryRange: readRequisitionText(data, 'salaryRange', 120),
      urgency: readRequisitionText(data, 'urgency', 20, true),
      budgetApproved: readRequisitionText(data, 'budgetApproved', 20, true),
      applicationUrl: readRequisitionText(data, 'applicationUrl', 500),
      jobDescription: readRequisitionText(data, 'jobDescription', 6000, true),
      requirements: readRequisitionText(data, 'requirements', 4000),
      additionalNotes: readRequisitionText(data, 'additionalNotes', 3000),
    };

    const workplaceTypes = ['On-site', 'Hybrid', 'Remote'];
    const employmentTypes = ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship'];
    const urgencyLevels = ['Standard', 'High', 'Urgent'];
    const budgetStatuses = ['Yes', 'No', 'Pending'];
    const openings = Number(data.numberOfOpenings);
    if (!Number.isInteger(openings) || openings < 1 || openings > 500) {
      throw new HttpsError('invalid-argument', 'Number of openings must be between 1 and 500.');
    }
    if (!workplaceTypes.includes(requisition.workplaceType) || !employmentTypes.includes(requisition.employmentType) ||
        !urgencyLevels.includes(requisition.urgency) || !budgetStatuses.includes(requisition.budgetApproved)) {
      throw new HttpsError('invalid-argument', 'One or more selected requisition options are invalid.');
    }
    requisition.numberOfOpenings = openings;

    if (requisition.targetStartDate && !/^\d{4}-\d{2}-\d{2}$/.test(requisition.targetStartDate)) {
      throw new HttpsError('invalid-argument', 'Target start date must use YYYY-MM-DD format.');
    }
    if (requisition.applicationUrl) {
      let applicationUrl;
      try {
        applicationUrl = new URL(requisition.applicationUrl);
      } catch (err) {
        throw new HttpsError('invalid-argument', 'Application link must be a valid URL.');
      }
      if (!['http:', 'https:'].includes(applicationUrl.protocol)) {
        throw new HttpsError('invalid-argument', 'Application link must use HTTP or HTTPS.');
      }
    }

    const requesterName = String(request.auth.token.name || 'Signed-in user').slice(0, 160);
    let requesterEmail = String(request.auth.token.email || '').slice(0, 254);
    try {
      const profileSnapshot = await admin.firestore()
        .collection('publicProfiles')
        .doc(request.auth.uid)
        .get();
      const profileEmail = profileSnapshot.exists ? profileSnapshot.get('email') : '';
      if (typeof profileEmail === 'string' && profileEmail.trim()) {
        requesterEmail = profileEmail.trim().slice(0, 254);
      }
    } catch (err) {
      console.error('Unable to read requester profile email; using Firebase Auth email:', err);
    }
    const requisitionRef = requisitionsDb.collection('jobRequisitions').doc();

    try {
      await requisitionRef.create({
        ...requisition,
        requesterUid: request.auth.uid,
        requesterName,
        requesterEmail,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error('Unable to save job requisition to Firestore:', err);
      throw new HttpsError('internal', 'Unable to save your requisition. Please try again later.');
    }

    try {
      const savedSnapshot = await requisitionRef.get();
      if (!savedSnapshot.exists) {
        throw new Error('Saved requisition document was not found.');
      }
      const savedRequisition = savedSnapshot.data();
      const emailFields = [
        ['Job title', savedRequisition.jobTitle],
        ['Department / team', savedRequisition.department],
        ['Hiring manager', savedRequisition.hiringManager],
        ['Work location', savedRequisition.workLocation],
        ['Work arrangement', savedRequisition.workplaceType],
        ['Employment type', savedRequisition.employmentType],
        ['Number of openings', String(savedRequisition.numberOfOpenings)],
        ['Target start date', savedRequisition.targetStartDate || 'Not specified'],
        ['Salary range', savedRequisition.salaryRange || 'Not specified'],
        ['Hiring priority', savedRequisition.urgency],
        ['Budget approved', savedRequisition.budgetApproved],
        ['Application / role link', savedRequisition.applicationUrl || 'Not provided'],
        ['Role summary and responsibilities', savedRequisition.jobDescription],
        ['Required experience and qualifications', savedRequisition.requirements || 'Not provided'],
        ['Additional notes', savedRequisition.additionalNotes || 'Not provided'],
        ['Submitted by', savedRequisition.requesterName],
        ['Requester email', savedRequisition.requesterEmail || 'Not available'],
      ];
      const htmlRows = emailFields.map(([label, value]) =>
        `<tr><th style="padding:10px;text-align:left;vertical-align:top;border-bottom:1px solid #e2e8f0;color:#12304f;width:230px">${escapeHtml(label)}</th><td style="padding:10px;white-space:pre-wrap;border-bottom:1px solid #e2e8f0;color:#334155">${escapeHtml(value)}</td></tr>`
      ).join('');
      const textBody = emailFields.map(([label, value]) => `${label}:\n${value}`).join('\n\n');
      const subjectTitle = savedRequisition.jobTitle.replace(/[\r\n]+/g, ' ').slice(0, 160);
      const email = {
        From: 'admin-messages@ibrecruitment.com',
        To: 'uk-hr-enquiries@ibrecruitment.com',
        Subject: `Job requisition request: ${subjectTitle}`,
        HtmlBody: `<html><body style="font-family:Arial,sans-serif;color:#0f172a"><h1 style="color:#0b2a6f">New job requisition</h1><p>A requisition has been submitted through the Impact in Business Recruitment portal.</p><table style="width:100%;border-collapse:collapse">${htmlRows}</table></body></html>`,
        TextBody: `New job requisition\n\n${textBody}`,
        MessageStream: 'outbound',
      };
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(savedRequisition.requesterEmail || '')) {
        email.ReplyTo = savedRequisition.requesterEmail;
      }
      await sendJobRequisitionOutboundNotification(email);
      return {
        ok: true,
        saved: true,
        notificationSent: true,
        requisitionId: requisitionRef.id,
        message: 'Requisition notification sent.',
      };
    } catch (err) {
      console.error('Unable to load saved job requisition or send its Postmark notification:', err);
      return {
        ok: true,
        saved: true,
        notificationSent: false,
        requisitionId: requisitionRef.id,
        message: 'Your requisition was saved, but the recruitment team could not be notified. Please contact them directly; do not submit it again.',
      };
    }
  });
