import ApiError from '../utils/ApiError.js';
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  verifyCsrfToken,
} from '../utils/cookieConfig.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Double-submit cookie CSRF protection: the client must echo the
// csrf_token cookie value back in the X-CSRF-Token header. Safe
// methods are never blocked.
const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.get(CSRF_HEADER_NAME);

  if (
    !cookieToken ||
    !headerToken ||
    cookieToken !== headerToken ||
    !verifyCsrfToken(cookieToken)
  ) {
    return next(
      new ApiError(403, 'Invalid or missing CSRF token')
    );
  }

  next();
};

export default csrfProtection;
