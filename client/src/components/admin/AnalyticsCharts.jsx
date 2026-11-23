import { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

import { getAnalytics } from '../../services/analyticsService';
import { useRealtimeRefresh } from '../../hooks/useRealtime';

const COLORS = ['#7c3aed', '#4f46e5', '#a78bfa', '#c4b5fd', '#8b5cf6', '#6366f1'];

const Card = ({ title, children }) => (
  <div className="analytics-card">
    <h3 className="analytics-card-title">{title}</h3>
    {children}
  </div>
);

const ChartState = ({ loading, error, empty, children }) => {
  if (loading) return <div className="analytics-state">Loading…</div>;
  if (error)
    return <div className="analytics-state analytics-error">Failed to load chart data.</div>;
  if (empty) return <div className="analytics-state">No data available yet.</div>;
  return children;
};

export default function AnalyticsCharts() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await getAnalytics();
      setData(res.data);
    } catch {
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, []);

  useRealtimeRefresh(
    [
      'issue:created',
      'issue:assigned',
      'issue:status_changed',
      'dashboard:stats_updated',
      'staff:created',
      'staff:approved',
      'staff:rejected',
    ],
    load
  );

  const statusData = data?.statusDistribution || [];
  const priorityData = data?.priorityDistribution || [];
  const categoryData = data?.categoryDistribution || [];
  const trends = data?.monthlyTrends || [];
  const workload = data?.staffWorkload || [];

  return (
    <div className="analytics-grid">
      <Card title="Issue Status Distribution">
        <ChartState loading={loading} error={error} empty={!statusData.length}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="count"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {statusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartState>
      </Card>

      <Card title="Issue Priority Distribution">
        <ChartState loading={loading} error={error} empty={!priorityData.length}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartState>
      </Card>

      <Card title="Issues by Category">
        <ChartState loading={loading} error={error} empty={!categoryData.length}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartState>
      </Card>

      <Card title="Monthly Issue Trends">
        <ChartState loading={loading} error={error} empty={!trends.length}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="reported"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="resolved"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartState>
      </Card>

      <Card title="Staff Workload">
        <ChartState loading={loading} error={error} empty={!workload.length}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={workload} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#a78bfa" name="Total" radius={[0, 4, 4, 0]} />
              <Bar dataKey="active" fill="#7c3aed" name="Active" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartState>
      </Card>
    </div>
  );
}
