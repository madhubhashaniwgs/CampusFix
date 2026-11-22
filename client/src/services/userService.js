import apiClient from './apiClient';

// Create a staff account (Admin only)
export const createStaffMember = async (staffData) => {
  const response = await apiClient.post('/users/staff', staffData);
  return response.data;
};

// Admin user management
export const getUsers = async ({ role, status } = {}) => {
  const params = {};
  if (role) params.role = role;
  if (status) params.status = status;

  const response = await apiClient.get('/admin/users', { params });
  return response.data;
};

export const approveStaff = async (userId) => {
  const response = await apiClient.patch(
    `/admin/staff/${userId}/approve`
  );
  return response.data;
};

export const rejectStaff = async (userId) => {
  const response = await apiClient.patch(
    `/admin/staff/${userId}/reject`
  );
  return response.data;
};
