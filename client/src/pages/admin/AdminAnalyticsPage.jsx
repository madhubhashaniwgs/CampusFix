import AppLayout from '../../components/layouts/AppLayout';
import AnalyticsCharts from '../../components/admin/AnalyticsCharts';
import './AdminAnalyticsPage.css';

export default function AdminAnalyticsPage() {
  return (
    <AppLayout activeNav="analytics">
      <div className="analytics-page">
        <header className="analytics-page-header">
          <h1>Analytics</h1>
          <p>Live insights across issues, staff workload and monthly trends.</p>
        </header>
        <AnalyticsCharts />
      </div>
    </AppLayout>
  );
}
