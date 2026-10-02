const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { defineSecret } = require('firebase-functions/params');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');

admin.initializeApp();
const requisitionsDb = getFirestore(admin.app(), 'chung-lee');
const postmarkToken = defineSecret('POSTMARK_BROADCAST_TOKEN');
const postmarkOutboundToken = defineSecret('POSTMARK_OUTBOUND_TOKEN');

const SUBSTACK_RSS_URL = 'https://blogs.ibrecruitment.com/feed';

// Gen 2 scheduled function: Fetch RSS feed and store entries in Firestore
exports.fetchAndStoreRssToInsightsFeed = onSchedule({
  schedule: 'every 15 minutes',
  timeoutSeconds: 120,
  memory: '256MiB',
}, async (event) => {
    const Parser = require('rss-parser');
    const parser = new Parser();
    const feed = await parser.parseURL(SUBSTACK_RSS_URL);
    const db = admin.firestore();
    const batch = db.batch();
    let newCount = 0;

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

exports.submitPressCommunications = onCall({
  region: 'us-central1',
  invoker: 'public',
  cors: true,
  timeoutSeconds: 30,
  memory: '256MiB',
  secrets: [postmarkOutboundToken],
}, async (request) => {
  const data = request.data;
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before submitting a press communication.');
  }

  const allowedFields = [
    'companyName', 'pressOfficer', 'officerEmail', 'phoneNumber',
    'pressReleaseUrl', 'headline', 'announcementType', 'embargoDate',
    'summary', 'notes',
  ];
  if (!data || typeof data !== 'object' || Object.keys(data).some((field) => !allowedFields.includes(field))) {
    throw new HttpsError('invalid-argument', 'The press submission contains invalid fields.');
  }

  const announcementTypes = ['Press release', 'Media statement', 'Interview request', 'Spokesperson briefing', 'Statement'];
  const submission = {
    companyName: readRequisitionText(data, 'companyName', 160, true),
    pressOfficer: readRequisitionText(data, 'pressOfficer', 120, true),
    officerEmail: readRequisitionText(data, 'officerEmail', 254, true),
    phoneNumber: readRequisitionText(data, 'phoneNumber', 40),
    pressReleaseUrl: readRequisitionText(data, 'pressReleaseUrl', 500, true),
    headline: readRequisitionText(data, 'headline', 200, true),
    announcementType: readRequisitionText(data, 'announcementType', 40, true),
    embargoDate: readRequisitionText(data, 'embargoDate', 10),
    summary: readRequisitionText(data, 'summary', 6000, true),
    notes: readRequisitionText(data, 'notes', 3000),
  };
  if (!announcementTypes.includes(submission.announcementType)) {
    throw new HttpsError('invalid-argument', 'Select a valid announcement type.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submission.officerEmail)) {
    throw new HttpsError('invalid-argument', 'Press officer email must be a valid email address.');
  }
  if (submission.embargoDate && !/^\d{4}-\d{2}-\d{2}$/.test(submission.embargoDate)) {
    throw new HttpsError('invalid-argument', 'Embargo date must use YYYY-MM-DD format.');
  }
  let pressUrl;
  try {
    pressUrl = new URL(submission.pressReleaseUrl);
  } catch (err) {
    throw new HttpsError('invalid-argument', 'Press release link must be a valid URL.');
  }
  if (!['http:', 'https:'].includes(pressUrl.protocol)) {
    throw new HttpsError('invalid-argument', 'Press release link must use HTTP or HTTPS.');
  }

  const requesterName = String(request.auth.token.name || 'Signed-in user').slice(0, 160);
  const requesterEmail = String(request.auth.token.email || '').slice(0, 254);
  const submissionRef = requisitionsDb.collection('pressCommunications').doc();

  try {
    await submissionRef.create({
      ...submission,
      requesterUid: request.auth.uid,
      requesterName,
      requesterEmail,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('Unable to save press communication to Firestore:', err);
    throw new HttpsError('internal', 'Unable to save your press submission. Please try again later.');
  }

  try {
    const savedSnapshot = await submissionRef.get();
    if (!savedSnapshot.exists) {
      throw new Error('Saved press communication document was not found.');
    }
    const saved = savedSnapshot.data();
    const emailFields = [
      ['Company', saved.companyName],
      ['Headline', saved.headline],
      ['Announcement type', saved.announcementType],
      ['Press or media officer', saved.pressOfficer],
      ['Officer email', saved.officerEmail],
      ['Phone number', saved.phoneNumber || 'Not provided'],
      ['Original press release', saved.pressReleaseUrl],
      ['Embargo date', saved.embargoDate || 'Not specified'],
      ['Key message', saved.summary],
      ['Additional notes', saved.notes || 'Not provided'],
      ['Submitted by', saved.requesterName],
      ['Account email', saved.requesterEmail || 'Not available'],
    ];
    const htmlRows = emailFields.map(([label, value]) =>
      `<tr><th style="padding:10px;text-align:left;vertical-align:top;border-bottom:1px solid #e2e8f0;color:#12304f;width:230px">${escapeHtml(label)}</th><td style="padding:10px;white-space:pre-wrap;border-bottom:1px solid #e2e8f0;color:#334155">${escapeHtml(value)}</td></tr>`
    ).join('');
    const textBody = emailFields.map(([label, value]) => `${label}:\n${value}`).join('\n\n');
    const subjectTitle = saved.headline.replace(/[\r\n]+/g, ' ').slice(0, 160);
    const email = {
      From: 'admin-messages@ibrecruitment.com',
      To: 'uk-hr-enquiries@ibrecruitment.com',
      Subject: `Press communication: ${subjectTitle}`,
      HtmlBody: `<html><body style="font-family:Arial,sans-serif;color:#0f172a"><h1 style="color:#0b2a6f">New press and media submission</h1><p>A strategic communications brief has been submitted through the Impact in Business Recruitment portal.</p><table style="width:100%;border-collapse:collapse">${htmlRows}</table></body></html>`,
      TextBody: `New press and media submission\n\n${textBody}`,
      MessageStream: 'outbound',
    };
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(saved.officerEmail || '')) {
      email.ReplyTo = saved.officerEmail;
    }
    await sendJobRequisitionOutboundNotification(email);
    return {ok: true, saved: true, notificationSent: true, submissionId: submissionRef.id};
  } catch (err) {
    console.error('Unable to load saved press communication or send its Postmark notification:', err);
    return {
      ok: true,
      saved: true,
      notificationSent: false,
      submissionId: submissionRef.id,
      message: 'Your press submission was saved, but the communications team could not be notified. Please contact them directly; do not submit it again.',
    };
  }
});
