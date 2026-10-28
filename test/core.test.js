import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseRewriteRule, parseFlags, createRewriteTranslator } from '../src/core.js';

test('parseRewriteRule parses a basic directive with no flags', () => {
  const out = parseRewriteRule('RewriteRule ^/old$ /new');
  assert.deepEqual(out, { pattern: '^/old$', substitution: '/new', flags: {} });
});

test('parseRewriteRule parses a directive with a single bare flag', () => {
  const out = parseRewriteRule('RewriteRule ^/old$ /new [L]');
  assert.deepEqual(out, { pattern: '^/old$', substitution: '/new', flags: { L: null } });
});

test('parseRewriteRule parses a directive with multiple flags', () => {
  const out = parseRewriteRule('RewriteRule ^/old$ /new [R=301,L]');
  assert.deepEqual(out, {
    pattern: '^/old$',
    substitution: '/new',
    flags: { R: '301', L: null },
  });
});

test('parseRewriteRule is case-insensitive on the directive keyword', () => {
  const out = parseRewriteRule('rewriterule ^/old$ /new');
  assert.deepEqual(out, { pattern: '^/old$', substitution: '/new', flags: {} });
});

test('parseRewriteRule preserves flag values verbatim', () => {
  const out = parseRewriteRule('RewriteRule ^/a$ /b [R=301,L,E=VAR:value]');
  assert.deepEqual(out.flags, { R: '301', L: null, E: 'VAR:value' });
});

test('parseRewriteRule normalizes flag names to uppercase', () => {
  const out = parseRewriteRule('RewriteRule ^/a$ /b [l,r=302]');
  assert.deepEqual(out.flags, { L: null, R: '302' });
});

test('parseRewriteRule throws when keyword is missing', () => {
  assert.throws(() => parseRewriteRule('^/old$ /new'), /expected a RewriteRule directive/);
});

test('parseRewriteRule throws on empty input', () => {
  assert.throws(() => parseRewriteRule('   '), /input is empty/);
});

test('parseRewriteRule throws when pattern or substitution is absent', () => {
  assert.throws(() => parseRewriteRule('RewriteRule ^/old$'), /pattern and a substitution/);
});

test('parseRewriteRule throws when a third field is not a bracketed group', () => {
  assert.throws(
    () => parseRewriteRule('RewriteRule ^/a$ /b stray'),
    /third field must be a bracketed flags group/,
  );
});

test('parseRewriteRule throws on too many fields', () => {
  assert.throws(() => parseRewriteRule('RewriteRule ^/a$ /b [L] extra'), /too many fields/);
});

test('parseFlags handles empty brackets', () => {
  assert.deepEqual(parseFlags('[]'), {});
});

test('parseFlags skips empty segments from doubled commas', () => {
  const out = parseFlags('[L,,R=301]');
  assert.deepEqual(out, { L: null, R: '301' });
});

test('parseFlags throws on a flag with an empty name', () => {
  assert.throws(() => parseFlags('[=301]'), /empty name/);
});

test('createRewriteTranslator returns a function that behaves like parseRewriteRule', () => {
  const translate = createRewriteTranslator();
  assert.equal(typeof translate, 'function');
  const out = translate('RewriteRule ^/x$ /y [QSA]');
  assert.deepEqual(out, { pattern: '^/x$', substitution: '/y', flags: { QSA: null } });
});

test('createRewriteTranslator is stateless across calls', () => {
  const translate = createRewriteTranslator();
  const a = translate('RewriteRule ^/a$ /b [L]');
  const b = translate('RewriteRule ^/c$ /d [R=302]');
  assert.deepEqual(a.flags, { L: null });
  assert.deepEqual(b.flags, { R: '302' });
});

test('parseRewriteRule accepts a substitution that looks like a flag', () => {
  // The substitution field can legitimately contain characters that look
  // flag-like; we only treat the last token as flags if it is bracketed.
  const out = parseRewriteRule('RewriteRule ^/a$ /b[L]');
  assert.deepEqual(out, { pattern: '^/a$', substitution: '/b[L]', flags: {} });
});

test('parseRewriteRule handles extra whitespace between fields', () => {
  const out = parseRewriteRule('RewriteRule    ^/old$    /new    [L]');
  assert.deepEqual(out, { pattern: '^/old$', substitution: '/new', flags: { L: null } });
});

test('parseRewriteRule rejects non-string input', () => {
  assert.throws(() => parseRewriteRule(42), /expected a string/);
});
