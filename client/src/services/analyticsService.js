import apiClient from './apiClient';

export const getAnalytics = async (params = {}) => {
  const response = await apiClient.get('/admin/analytics', { params });
  return response.data;
};
