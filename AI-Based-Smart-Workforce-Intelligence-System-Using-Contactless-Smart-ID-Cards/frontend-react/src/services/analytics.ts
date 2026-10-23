import api from './api';
import type { AnalyticsData, HourlyData } from '@models/analytics';
import type { ApiResponse } from '@models/api';

export const analyticsService = {
  getDashboardStats: async (): Promise<AnalyticsData> => {
    const { data } = await api.get<ApiResponse<AnalyticsData>>('/analytics/dashboard');
    if (!data.data) throw new Error('Failed to fetch analytics');
    return data.data;
  },

  getHourlyData: async (date?: string): Promise<HourlyData[]> => {
    const params = date ? { date } : {};
    const { data } = await api.get<ApiResponse<HourlyData[]>>('/analytics/hourly', { params });
    return data.data || [];
  },

  getPunctualityReport: async (): Promise<any> => {
    const { data } = await api.get('/analytics/punctuality');
    return data.data || {};
  },
};
