import auditService from '../services/auditService.js';
import ApiResponse from '../utils/ApiResponse.js';

class AuditController {
  listAuditLogs = async (req, res, next) => {
    try {
      const { logs, pagination } = await auditService.listAuditLogs(req.auditLogQuery);

      const response = new ApiResponse(200, 'Audit logs retrieved successfully', logs);

      response.pagination = pagination;

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}

export default new AuditController();
