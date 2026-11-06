
import apiClient from './apiClient';

// Create a new issue
export const createIssue = async (issueData) => {
  const response = await apiClient.post('/issues', issueData);
  return response.data;
};

// Get issues relevant to the logged-in user's role
export const getIssues = async () => {
  const response = await apiClient.get('/issues');
  return response.data;
};

// Get issue details
export const getIssueById = async (issueId) => {
  const response = await apiClient.get(`/issues/${issueId}`);
  return response.data;
};

// Get available staff members (Admin only)
export const getStaffMembers = async () => {
  const response = await apiClient.get('/issues/staff');
  return response.data;
};

// Assign issue to a staff member (Admin only)
export const assignIssue = async (issueId, staffId) => {
  const response = await apiClient.patch(
    `/issues/${issueId}/assign`,
    { staffId }
  );

  return response.data;
};

// Update issue status (Staff / Admin)
export const updateIssueStatus = async (issueId, status, note = '') => {
  const response = await apiClient.patch(
    `/issues/${issueId}/status`,
    { status, note }
  );

  return response.data;
};
