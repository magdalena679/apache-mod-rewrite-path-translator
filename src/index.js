/**
 * Public entry point for the translator.
 *
 * The package is ESM-only. We re-export parseRewriteRule and createRewriteTranslator
 * because the two-layer design lets a caller obtain a stateless function (the
 * translator) while still reaching the raw parser when it needs to inspect tokens.
 */
export { parseRewriteRule, createRewriteTranslator } from './core.js';
