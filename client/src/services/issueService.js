import apiClient from './apiClient';

// Create a new issue
export const createIssue = async (issueData) => {
  const response = await apiClient.post('/issues', issueData);
  return response.data;
};

// Get issues relevant to the logged-in user's role.
// Supports pagination, filters and search via query params.
export const getIssues = async (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  const response = await apiClient.get(`/issues${queryString ? `?${queryString}` : ''}`);
  return response.data;
};

// Get the total number of issues matching the given filters
// without fetching the issue documents themselves.
export const getIssueCount = async (params = {}) => {
  const response = await getIssues({ ...params, limit: 1 });
  return response.pagination?.totalItems || 0;
};

// Get issue details
export const getIssueById = async (issueId) => {
  const response = await apiClient.get(`/issues/${issueId}`);
  return response.data;
};

// Get available staff members (Admin only)
export const getStaffMembers = async ({ page, limit } = {}) => {
  const params = {};
  if (page) params.page = page;
  if (limit) params.limit = limit;

  const response = await apiClient.get('/issues/staff', { params });
  return response.data;
};

// Assign issue to a staff member (Admin only)
export const assignIssue = async (issueId, staffId) => {
  const response = await apiClient.patch(`/issues/${issueId}/assign`, { staffId });

  return response.data;
};

// Update issue status (Staff / Admin)
export const updateIssueStatus = async (issueId, status, note = '') => {
  const response = await apiClient.patch(`/issues/${issueId}/status`, { status, note });

  return response.data;
};
