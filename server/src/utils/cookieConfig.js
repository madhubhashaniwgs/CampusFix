import crypto from 'crypto';

export const AUTH_COOKIE_NAME = 'campusfix_token';
export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

// CSRF tokens are random values signed with the server secret so a
// client (or a subdomain attacker performing cookie tossing) cannot
// mint a valid token — only echo one the server issued.
export const signCsrfToken = (token) => {
  const signature = crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(token)
    .digest('hex');
  return `${token}.${signature}`;
};

export const verifyCsrfToken = (signedToken) => {
  if (!signedToken || typeof signedToken !== 'string') return false;

  const dotIndex = signedToken.lastIndexOf('.');
  if (dotIndex <= 0) return false;

  const token = signedToken.slice(0, dotIndex);
  const signature = signedToken.slice(dotIndex + 1);

  const expected = crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(token)
    .digest('hex');

  if (signature.length !== expected.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
};

const isProduction = process.env.NODE_ENV === 'production';

// Parse simple JWT expiry strings (e.g. "1h", "7d", "30m", "3600s")
// into milliseconds for cookie maxAge.
const expiresInToMs = (value) => {
  const match = String(value || '1h').match(/^(\d+)([smhd])$/);
  if (!match) return 60 * 60 * 1000;

  const amount = Number(match[1]);
  const unit = match[2];

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
};

const cookieMaxAge = () =>
  expiresInToMs(process.env.JWT_EXPIRES_IN || '1h');

// SameSite=None requires Secure and is only meaningful for
// cross-site deployments (e.g. frontend and backend on different
// Vercel domains). SameSite=Lax is the safe default.
const sameSite = () => {
  const configured = process.env.COOKIE_SAMESITE;
  if (configured) return configured;
  return isProduction ? 'lax' : 'lax';
};

const baseOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: sameSite(),
  path: '/',
});

export const authCookieOptions = () => ({
  ...baseOptions(),
  maxAge: cookieMaxAge(),
});

export const csrfCookieOptions = () => ({
  httpOnly: false,
  secure: isProduction,
  sameSite: sameSite(),
  path: '/',
  maxAge: cookieMaxAge(),
});

export const setAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
};

export const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: sameSite(),
    path: '/',
  });
};

export const setCsrfCookie = (res, token) => {
  res.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions());
};
