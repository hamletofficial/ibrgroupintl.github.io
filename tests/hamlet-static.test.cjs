const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('app/hamlet/index.html', 'utf8');
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
});

test('advanced transaction features are present and connected', () => {
  for (const id of [
    'hamletAdvancedTools', 'transactionHistoryList', 'transactionDocumentForm',
    'transactionDocumentsList', 'savedSearchForm', 'savedSearchesList',
    'dealIntelligenceList', 'firebase-storage-compat.js'
  ]) assert.ok(html.includes(id), 'missing feature hook: ' + id);
  assert.match(html, /function renderAll\(\)[\s\S]*?renderAdvancedPanels\(\)/);
  assert.match(html, /function checkSavedSearchAlerts\(\)/);
  assert.match(html, /function renderDealIntelligence\(\)/);
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
