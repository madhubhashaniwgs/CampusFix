import issueService from '../services/issueService.js';
import ApiResponse from '../utils/ApiResponse.js';

class IssueController {
  createIssue = async (req, res, next) => {
    try {
      const issue = await issueService.createIssue(
        req.body,
        req.user.id
      );

      res.status(201).json(
        new ApiResponse(
          201,
          'Issue reported successfully',
          issue
        )
      );
    } catch (error) {
      next(error);
    }
  };

  getIssues = async (req, res, next) => {
    try {
      const issues = await issueService.getIssues(req.user);

      res.status(200).json(
        new ApiResponse(
          200,
          'Issues retrieved successfully',
          issues
        )
      );
    } catch (error) {
      next(error);
    }
  };

  getIssueById = async (req, res, next) => {
    try {
      const issue = await issueService.getIssueById(
        req.params.id,
        req.user
      );

      res.status(200).json(
        new ApiResponse(
          200,
          'Issue retrieved successfully',
          issue
        )
      );
    } catch (error) {
      next(error);
    }
  };

  updateIssueStatus = async (req, res, next) => {
    try {
      const { status, note } = req.body;

      const issue = await issueService.updateIssueStatus(
        req.params.id,
        status,
        note,
        req.user
      );

      res.status(200).json(
        new ApiResponse(
          200,
          'Issue status updated successfully',
          issue
        )
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new IssueController();