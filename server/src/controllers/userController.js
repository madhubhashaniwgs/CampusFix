import userService from '../services/userService.js';
import ApiResponse from '../utils/ApiResponse.js';

class UserController {
  createStaff = async (req, res, next) => {
    try {
      const user = await userService.createStaff(req.body, req.user);

      res.status(201).json(new ApiResponse(201, 'Staff account created successfully', user));
    } catch (error) {
      next(error);
    }
  };

  listUsers = async (req, res, next) => {
    try {
      const { role, status, page, limit } = req.query;

      const result = await userService.listUsers({
        role,
        status,
        page: Math.max(1, parseInt(page, 10) || 1),
        limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 10)),
      });

      res.status(200).json(new ApiResponse(200, 'Users retrieved successfully', result));
    } catch (error) {
      next(error);
    }
  };

  approveStaff = async (req, res, next) => {
    try {
      const user = await userService.approveStaff(req.params.id, req.user);

      res.status(200).json(new ApiResponse(200, 'Staff member approved', user));
    } catch (error) {
      next(error);
    }
  };

  rejectStaff = async (req, res, next) => {
    try {
      const user = await userService.rejectStaff(req.params.id, req.user);

      res.status(200).json(new ApiResponse(200, 'Staff registration rejected', user));
    } catch (error) {
      next(error);
    }
  };
}

export default new UserController();
