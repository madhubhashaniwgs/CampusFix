import { randomBytes } from 'crypto';

import authService from '../services/authService.js';
import ApiResponse from '../utils/ApiResponse.js';
import {
  setAuthCookie,
  clearAuthCookie,
  setCsrfCookie,
  signCsrfToken,
  CSRF_COOKIE_NAME,
} from '../utils/cookieConfig.js';

class AuthController {
  register = async (req, res, next) => {
    try {
      const result = await authService.register(req.body);

      // The JWT is delivered only via an httpOnly cookie and is
      // intentionally absent from the response body.
      setAuthCookie(res, result.token);

      res.status(201).json(
        new ApiResponse(201, 'Registration successful', {
          user: result.user,
        })
      );
    } catch (error) {
      next(error);
    }
  };

  login = async (req, res, next) => {
    try {
      const result = await authService.login(
        req.body.email,
        req.body.password
      );

      setAuthCookie(res, result.token);

      res.status(200).json(
        new ApiResponse(200, 'Login successful', {
          user: result.user,
        })
      );
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req, res, next) => {
    try {
      const user = await authService.getCurrentUser(req.user.id);

      res.status(200).json(
        new ApiResponse(200, 'User retrieved successfully', user)
      );
    } catch (error) {
      next(error);
    }
  };

  getCsrfToken = (req, res) => {
    const csrfToken = signCsrfToken(randomBytes(32).toString('hex'));

    setCsrfCookie(res, csrfToken);

    res.status(200).json(
      new ApiResponse(200, 'CSRF token issued', {
        csrfToken,
        cookieName: CSRF_COOKIE_NAME,
      })
    );
  };

  logout = async (req, res, next) => {
    try {
      // Invalidates all JWTs issued for this user so a copied
      // token cannot be reused after logout.
      await authService.logout(req.user.id);

      clearAuthCookie(res);

      res.status(200).json(
        new ApiResponse(200, 'Logout successful')
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new AuthController();
