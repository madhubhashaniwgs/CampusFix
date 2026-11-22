import userService from '../services/userService.js';
import ApiResponse from '../utils/ApiResponse.js';

class UserController {
  createStaff = async (req, res, next) => {
    try {
      const user = await userService.createStaff(req.body);

      res.status(201).json(
        new ApiResponse(201, 'Staff account created successfully', user)
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new UserController();
