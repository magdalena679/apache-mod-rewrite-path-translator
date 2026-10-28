# apache-mod-rewrite-path-translator

Converts an Apache `mod_rewrite` directive string into a structured object of pattern, substitution, and flags. ESM-only, zero dependencies.

## Usage

```js
import { parseRewriteRule, createRewriteTranslator } from 'apache-mod-rewrite-path-translator';

const rule = parseRewriteRule('RewriteRule ^/old/(.*)$ /new/$1 [R=301,L]');
// { pattern: '^/old/(.*)$', substitution: '/new/$1', flags: { R: '301', L: null } }

const translate = createRewriteTranslator();
translate('RewriteRule ^/x$ /y [QSA]');
// { pattern: '^/x$', substitution: '/y', flags: { QSA: null } }
```

Exported names: `parseRewriteRule`, `parseFlags`, `createRewriteTranslator`.

## Why this exists

Translating `mod_rewrite` rules into a structured form is the first step before you can port, diff, or audit them. This library does only that translation step and nothing further: it does not evaluate regex semantics, apply flags, or resolve conditions. The trade-off is deliberate — a translator that also tries to be an engine grows fragile and opinionated fast.

## Scope and decisions

Only the `RewriteRule pattern substitution [flags]` form is parsed. The directive keyword is matched case-insensitively, matching Apache's own config parser. Flags are read from a single trailing bracketed group and separated by commas; each flag is either a bare name (`L`) or `name=value` (`R=301`). Unknown flags are kept verbatim in the `flags` map with the name upper-cased, so callers can post-process without the parser dropping information.

## Awkward edge

A third token is only treated as flags when it is wrapped in `[...]`. A bare trailing token causes an error rather than a silent misparse. If your input contains rules where the substitution itself ends in something that looks like a bracketed group but is not separated by whitespace, it will be absorbed into the substitution string — Apache would have the same ambiguity, and we resolve it the same way: whitespace is the delimiter.
