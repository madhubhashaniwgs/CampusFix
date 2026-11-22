import issueService from '../services/issueService.js';
import ApiResponse from '../utils/ApiResponse.js';

class IssueController {
  createIssue = async (req, res, next) => {
    try {
      const issue = await issueService.createIssue(req.body, req.user.id);

      res.status(201).json(new ApiResponse(201, 'Issue reported successfully', issue));
    } catch (error) {
      next(error);
    }
  };

  getIssues = async (req, res, next) => {
    try {
      const { issues, pagination } = await issueService.getIssues(
        req.user,
        req.issueListQuery || {}
      );

      const response = new ApiResponse(200, 'Issues retrieved successfully', issues);

      response.pagination = pagination;

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getIssueById = async (req, res, next) => {
    try {
      const issue = await issueService.getIssueById(req.params.id, req.user);

      res.status(200).json(new ApiResponse(200, 'Issue retrieved successfully', issue));
    } catch (error) {
      next(error);
    }
  };

  updateIssueStatus = async (req, res, next) => {
    try {
      const { status, note } = req.body;

      const issue = await issueService.updateIssueStatus(req.params.id, status, note, req.user);

      res.status(200).json(new ApiResponse(200, 'Issue status updated successfully', issue));
    } catch (error) {
      next(error);
    }
  };

  getStaffMembers = async (req, res, next) => {
    try {
      const { page, limit } = req.query;

      const result = await issueService.getStaffMembers({
        page: Math.max(1, parseInt(page, 10) || 1),
        limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 10)),
      });

      res.status(200).json(new ApiResponse(200, 'Staff members retrieved successfully', result));
    } catch (error) {
      next(error);
    }
  };

  assignIssue = async (req, res, next) => {
    try {
      const { staffId } = req.body;

      const issue = await issueService.assignIssue(req.params.id, staffId, req.user.id);

      res.status(200).json(new ApiResponse(200, 'Issue assigned successfully', issue));
    } catch (error) {
      next(error);
    }
  };
}

export default new IssueController();
