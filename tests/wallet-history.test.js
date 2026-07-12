// wallet-history.js escapeHtml — regression guard for the profile-import stored-XSS fix.
// Ledger `reason`/`balance` can now come from an imported profile and are written into
// innerHTML, so they must be HTML-escaped before insertion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installLocalStorage } from './helpers.js';

installLocalStorage();                                   // store.js is imported transitively
const { escapeHtml } = await import('../js/wallet-history.js');

test('neutralises an injected <img onerror> payload', () => {
  const out = escapeHtml('<img src=x onerror=alert(document.cookie)>');
  assert.ok(!out.includes('<'), 'no raw < left to open a tag');
  assert.ok(!out.includes('>'), 'no raw > left to close a tag');
  assert.equal(out, '&lt;img src=x onerror=alert(document.cookie)&gt;');
});

test('escapes all five HTML-significant characters', () => {
  assert.equal(escapeHtml(`& < > " '`), '&amp; &lt; &gt; &quot; &#39;');
});

test('leaves ordinary ledger text unchanged', () => {
  assert.equal(escapeHtml('Bought car: Toretto'), 'Bought car: Toretto');
  assert.equal(escapeHtml('Stainless Speedway — 12 tires'), 'Stainless Speedway — 12 tires');
});

test('coerces non-strings (e.g. a numeric balance) to a safe string', () => {
  assert.equal(escapeHtml(500), '500');
  assert.equal(escapeHtml(-7), '-7');
});
