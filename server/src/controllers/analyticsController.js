import analyticsService from '../services/analyticsService.js';
import ApiResponse from '../utils/ApiResponse.js';

class AnalyticsController {
  getDashboardAnalytics = async (req, res, next) => {
    try {
      const data = await analyticsService.getDashboardAnalytics(req.analyticsQuery);
      res.status(200).json(new ApiResponse(200, 'Analytics retrieved', data));
    } catch (error) {
      next(error);
    }
  };
}

export default new AnalyticsController();
