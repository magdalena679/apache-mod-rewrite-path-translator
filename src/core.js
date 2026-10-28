/**
 * Apache mod_rewrite Path Translator — core parser.
 *
 * Scope decision (one interpretation, documented in README):
 * We translate only the most common, well-structured directive form:
 *
 *     RewriteRule pattern substitution [flags]
 *
 * Flags appear inside a single bracketed group separated by commas, matching
 * Apache's documented syntax. Unknown flags are preserved verbatim in the
 * `flags` map so the caller can decide what to do with them. We intentionally
 * do not evaluate per-flag semantics here — that would require an engine, not a
 * translator, and the brief is for translation only.
 */

/**
 * Parse a single RewriteRule line into a structured object.
 *
 * @param {string} input
 * @returns {{pattern: string, substitution: string, flags: Record<string, string|null>}}
 * @throws {Error} if the directive keyword is missing, or if there are too few or
 *   too many fields. We refuse to guess when the shape is wrong — a bad parse
 *   is worse than an honest exception.
 */
export function parseRewriteRule(input) {
  if (typeof input !== 'string') {
    throw new TypeError('parseRewriteRule: expected a string');
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new Error('parseRewriteRule: input is empty');
  }

  // Match the leading keyword case-insensitively. Apache's config parser is
  // case-insensitive on directive names, so we mirror that rather than
  // surprising users who write "rewriterule" in lowercase.
  const keywordMatch = /^(RewriteRule)\s+/i.exec(trimmed);
  if (!keywordMatch) {
    throw new Error(`parseRewriteRule: expected a RewriteRule directive, got: ${trimmed.slice(0, 40)}`);
  }

  const rest = trimmed.slice(keywordMatch[0].length).trim();
  if (rest.length === 0) {
    throw new Error('parseRewriteRule: directive has no pattern or substitution');
  }

  // Tokens are space-separated. The optional flags live in a single
  // bracketed group at the end, e.g. [R=301,L]. We split first, then detect
  // the bracket group as the last token if it starts with '[' and ends with ']'.
  const tokens = rest.split(/\s+/);
  if (tokens.length < 2) {
    throw new Error('parseRewriteRule: directive must have a pattern and a substitution');
  }
  if (tokens.length > 3) {
    throw new Error('parseRewriteRule: too many fields; expected pattern, substitution, [flags]');
  }

  const pattern = tokens[0];
  const substitution = tokens[1];
  let flags = {};

  if (tokens.length === 3) {
    const raw = tokens[2];
    if (raw.startsWith('[') && raw.endsWith(']')) {
      flags = parseFlags(raw);
    } else {
      // Apache does not accept a bare third token here. Rather than silently
      // dropping it or mislabelling it as a flag, we fail loudly.
      throw new Error(`parseRewriteRule: third field must be a bracketed flags group, got: ${raw}`);
    }
  }

  return { pattern, substitution, flags };
}

/**
 * Parse the bracketed flags group, e.g. "[R=301,L]".
 *
 * @param {string} raw
 * @returns {Record<string, string|null>}
 */
export function parseFlags(raw) {
  if (typeof raw !== 'string') {
    throw new TypeError('parseFlags: expected a string');
  }

  let body = raw;
  if (body.startsWith('[')) body = body.slice(1);
  if (body.endsWith(']')) body = body.slice(0, -1);

  body = body.trim();
  if (body.length === 0) {
    return {};
  }

  const flags = {};
  // Flags are comma-separated inside the brackets. Each flag may be a bare
  // name ("L") or name=value ("R=301").
  const parts = body.split(',');
  for (const part of parts) {
    const flag = part.trim();
    if (flag.length === 0) {
      // A trailing or doubled comma yields an empty segment. Apache treats
      // these as no-ops, so we skip them rather than producing a stray key.
      continue;
    }
    const eq = flag.indexOf('=');
    if (eq === -1) {
      flags[flag.toUpperCase()] = null;
    } else {
      const name = flag.slice(0, eq).trim().toUpperCase();
      const value = flag.slice(eq + 1).trim();
      if (name.length === 0) {
        throw new Error(`parseFlags: flag with empty name in segment: ${flag}`);
      }
      flags[name] = value;
    }
  }

  return flags;
}

/**
 * Create a reusable translator function.
 *
 * Returns a closure that accepts a single RewriteRule string and yields the
 * structured object. We expose this because constructing a fresh translator
 * per call is wasteful when the caller already holds configuration; here the
 * "configuration" is the parse policy, and the closure is stateless, which
 * keeps the public API simple while leaving room to add settings later.
 *
 * @returns {(input: string) => {pattern: string, substitution: string, flags: Record<string, string|null>}}
 */
export function createRewriteTranslator() {
  return (input) => parseRewriteRule(input);
}
