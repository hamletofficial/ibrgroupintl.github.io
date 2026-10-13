const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('app/hamlet/index.html', 'utf8');
const messagesHtml = fs.readFileSync('messages.html', 'utf8');
const firestore = fs.readFileSync('firestore.rules', 'utf8');
const storage = fs.readFileSync('storage.rules', 'utf8');
const functions = fs.readFileSync('functions/index.js', 'utf8');

test('all inline JavaScript blocks parse', () => {
  const blocks = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((match) => match[2].trim() && !/\bsrc\s*=/.test(match[1]));
  assert.ok(blocks.length >= 2, 'expected authentication guard and workspace scripts');
  for (const [index, block] of blocks.entries()) {
    assert.doesNotThrow(() => new vm.Script(block[2], { filename: 'hamlet-inline-' + index + '.js' }));
  }
  assert.doesNotThrow(() => new vm.Script(functions, { filename: 'functions/index.js' }));
});

test('advanced transaction features are present and connected', () => {
  for (const id of [
    'hamletAdvancedTools', 'transactionHistoryList', 'transactionDocumentForm',
    'transactionDocumentsList', 'savedSearchForm', 'savedSearchesList',
    'dealIntelligenceList', 'dealCalculatorForm', 'calculatorValue', 'dealCalculatorResults', 'firebase-storage-compat.js'
  ]) assert.ok(html.includes(id), 'missing feature hook: ' + id);
  assert.match(html, /function renderAll\(\)[\s\S]*?renderAdvancedPanels\(\)/);
  assert.match(html, /function checkSavedSearchAlerts\(\)/);
  assert.match(html, /function renderDealIntelligence\(\)/);
});

test('mailbox bulk-delete action only removes messages sent by the signed-in member', () => {
  const deleteConversation = messagesHtml.match(/async function deleteConversation\(\)\{([\s\S]*?)\}\s*async function closeConversation/);
  assert.ok(deleteConversation, 'expected the mailbox delete function');
  assert.match(deleteConversation[1], /m\.senderUid===me\.uid&&m\.recipientUid===otherUid/);
  assert.match(deleteConversation[1], /Messages sent by the other member will remain/);
  assert.match(messagesHtml, /Delete My Messages/);
  assert.match(firestore, /allow delete: if request\.auth != null\s*&& request\.auth\.uid == resource\.data\.senderUid\s*&& request\.auth\.uid in resource\.data\.participants;/);
});

test('workspace search includes authenticated messages alongside deals, properties and public profiles', () => {
  assert.match(html, /Searches your deals, owned properties, accessible messages and public member profiles/);
  assert.match(html, /db\.collection\('directMessages'\)\.where\('participants','array-contains',u\.uid\)\.limit\(250\)\.get\(\)/);
  assert.match(html, /kind:'Message'/);
  assert.match(html, /href="\/messages\.html\?to='\+encodeURIComponent\(m\.id\)\+'"/);
});

test('deal activity timeline combines transaction changes, documents and critical-path reminders', () => {
  assert.match(html, /Deal activity timeline/);
  assert.match(html, /\.\.\.advancedHistory\.map\(e=>\(\{id:'event:'/);
  assert.match(html, /\.\.\.advancedDocuments\.map\(d=>\(\{id:'document:'/);
  assert.match(html, /\.\.\.reminders\.map\(r=>\(\{id:'reminder:'/);
});

test('commercial deal calculator computes rental yields, unit pricing and optional VAT-inclusive fees', () => {
  assert.match(html, /function calculateDealCalculator\\(\\)/);
  assert.match(html, /rent\\/price\\*100/);
  assert.match(html, /\\(rent-costs\\)\\/price\\*100/);
  assert.match(html, /price\\/area/);
  assert.match(html, /fee\\*1\\.2/);
  assert.match(html, /Calculations stay in this browser and are not saved to your account/);
});

test('transaction history is append-only and owner-scoped', () => {
  assert.match(firestore, /match \/hamletDealEvents\/{eventId}/);
  assert.match(firestore, /allow read: if request\.auth != null && resource\.data\.uid == request\.auth\.uid/);
  assert.match(firestore, /allow create, update, delete: if false;/);
  assert.match(functions, /exports\.recordHamletDealHistory = onDocumentWritten/);
  assert.match(firestore, /request\.resource\.data\.createdAt == request\.time/);
});

test('documents and saved searches have private owner rules', () => {
  assert.match(firestore, /match \/hamletDocuments\/{documentId}/);
  assert.match(firestore, /match \/hamletSavedSearches\/{searchId}/);
  assert.match(firestore, /request\.resource\.data\.uid == request\.auth\.uid/);
  assert.match(storage, /match \/hamletDocuments\/{userId}\/{dealId}\/{documentId}\/{fileName}/);
  assert.match(storage, /request\.auth\.uid == userId/);
  assert.match(storage, /request\.resource\.size <= 15 \* 1024 \* 1024/);
  assert.match(storage, /allow update: if false;/);
});
