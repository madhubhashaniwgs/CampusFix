import apiClient from './apiClient';

// Create a staff account (Admin only)
export const createStaffMember = async (staffData) => {
  const response = await apiClient.post('/users/staff', staffData);
  return response.data;
};
