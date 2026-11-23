import issueRepository, { analyticsAggregations } from '../repositories/issueRepository.js';

class AnalyticsService {
  async getDashboardAnalytics(query = {}) {
    const { months = 6, startDate, endDate } = query;
    const range = { startDate, endDate };

    const [status, priority, category, trends, workload] = await Promise.all([
      analyticsAggregations.groupBy('status', range),
      analyticsAggregations.groupBy('priority', range),
      analyticsAggregations.groupBy('category', range),
      analyticsAggregations.monthlyTrends({ months, ...range }),
      analyticsAggregations.staffWorkload(),
    ]);

    return {
      statusDistribution: status,
      priorityDistribution: priority,
      categoryDistribution: category,
      monthlyTrends: trends,
      staffWorkload: workload,
      generatedAt: new Date().toISOString(),
    };
  }
}

export default new AnalyticsService();
