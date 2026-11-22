import apiClient from './apiClient';

// Admin-only audit log listing
export const getAuditLogs = async ({
  page,
  limit,
  action,
  actorId,
  targetType,
  startDate,
  endDate,
} = {}) => {
  const params = {};
  if (page) params.page = page;
  if (limit) params.limit = limit;
  if (action) params.action = action;
  if (actorId) params.actorId = actorId;
  if (targetType) params.targetType = targetType;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const response = await apiClient.get('/admin/audit-logs', { params });
  return response.data;
};
