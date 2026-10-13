/**
 * backend/auth.js
 * 
 * Cryptographic Security & Authentication Utilities for SmartWorkforce.
 * Uses native Node.js `node:crypto`. Zero external dependencies.
 */

const crypto = require('crypto');

const SCRYPT_KEY_LEN = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 };

/**
 * Generate a cryptographically random salt (16 bytes hex)
 */
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Hash password using Node.js native crypto.scrypt
 */
function hashPassword(password, salt) {
  if (typeof password !== 'string' || !password) {
    throw new Error('Password must be a non-empty string.');
  }
  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEY_LEN, SCRYPT_OPTIONS);
  return derivedKey.toString('hex');
}

/**
 * Verify password against stored hash using constant-time comparison
 */
function verifyPassword(password, salt, storedHash) {
  if (!password || !salt || !storedHash) return false;
  try {
    const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEY_LEN, SCRYPT_OPTIONS);
    const candidateHash = derivedKey.toString('hex');
    const bufA = Buffer.from(candidateHash, 'hex');
    const bufB = Buffer.from(storedHash, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (_) {
    return false;
  }
}

/**
 * Generate high-entropy 256-bit random opaque token for HttpOnly cookies
 */
function generateOpaqueToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash session token for database storage (SHA-256)
 * Guarantees that a database dump does not expose active session tokens.
 */
function hashToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return null;
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Generate anti-CSRF token (256-bit random string)
 */
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Constant-time comparison for CSRF tokens
 */
function verifyCsrfToken(submittedToken, sessionCsrfToken) {
  if (!submittedToken || !sessionCsrfToken) return false;
  try {
    const bufA = Buffer.from(submittedToken, 'utf8');
    const bufB = Buffer.from(sessionCsrfToken, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (_) {
    return false;
  }
}

/**
 * Generate cryptographically random ID with prefix
 */
function generateId(prefix = 'ID') {
  return `${prefix}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

/**
 * Parse Cookie header from HTTP request
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return cookies;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx !== -1) {
      const key = part.substring(0, idx).trim();
      const val = part.substring(idx + 1).trim();
      cookies[key] = decodeURIComponent(val);
    }
  }
  return cookies;
}

/**
 * Format Set-Cookie header string
 */
function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || '/'}`);

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  if (options.httpOnly) {
    parts.push('HttpOnly');
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  } else {
    parts.push('SameSite=Lax');
  }
  if (options.secure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

module.exports = {
  generateSalt,
  hashPassword,
  verifyPassword,
  generateOpaqueToken,
  hashToken,
  generateCsrfToken,
  verifyCsrfToken,
  generateId,
  parseCookies,
  serializeCookie
};
