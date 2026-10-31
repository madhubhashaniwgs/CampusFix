import authService from '../services/authService.js';
import ApiResponse from '../utils/ApiResponse.js';

class AuthController {
  register = async (req, res, next) => {
    try {
      const result = await authService.register(req.body);

      res.status(201).json(
        new ApiResponse(201, 'Registration successful', result)
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

      res.status(200).json(
        new ApiResponse(200, 'Login successful', result)
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

  logout = (req, res) => {
    res.status(200).json(
      new ApiResponse(
        200,
        'Logout successful. Please remove your token from the client.'
      )
    );
  };
}

export default new AuthController();