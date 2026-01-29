import React, { useState, useEffect } from 'react';
import axios from '../../api/axios.js';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

interface KPI {
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  new_customers: number;
  total_customers: number;
  return_rate: number;
  payment_success_rate: number;
  pending_returns: number;
}

interface Metric {
  date: string;
  orders: number;
  revenue: number;
}

interface OrderAnalytic {
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  orders_by_status: Record<string, number>;
  order_trend: Metric[];
}

export default function AnalyticsDashboard() {
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [orderAnalytics, setOrderAnalytics] = useState<OrderAnalytic | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [error, setError] = useState('');

  const { user } = useSelector((state: any) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !['SuperAdmin', 'Admin'].includes(user?.role)) {
      navigate('/');
      return;
    }

    fetchAnalytics();
  }, [days, user]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      const [kpiRes, orderRes] = await Promise.all([
        axios.get('/analytics/kpi', { params: { days } }),
        axios.get('/analytics/orders', { params: { days } }),
      ]);

      if (kpiRes.data.success) {
        setKpis(kpiRes.data.kpis);
      }

      if (orderRes.data.success) {
        setOrderAnalytics(orderRes.data.metrics);
      }
    } catch (err: any) {
      setError('Failed to load analytics');
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      const response = await axios.get('/analytics/export', {
        params: { reportType: 'orders', days },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics_report_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
            <p className="text-gray-600">Track your business metrics and performance</p>
          </div>
          <div className="flex gap-3">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={exportReport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              📥 Export Report
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* KPI Cards */}
        {kpis && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Orders */}
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{kpis.total_orders}</p>
                  <p className="text-xs text-gray-500 mt-2">Last {days} days</p>
                </div>
                <span className="text-3xl">📦</span>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">₹{kpis.total_revenue.toFixed(0)}</p>
                  <p className="text-xs text-gray-500 mt-2">All orders</p>
                </div>
                <span className="text-3xl">💰</span>
              </div>
            </div>

            {/* Average Order Value */}
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-600">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Avg Order Value</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">₹{Number(kpis.avg_order_value).toFixed(0)}</p>
                  <p className="text-xs text-gray-500 mt-2">Per order</p>
                </div>
                <span className="text-3xl">📊</span>
              </div>
            </div>

            {/* Return Rate */}
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-600">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Return Rate</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{Number(kpis.return_rate).toFixed(1)}%</p>
                  <p className="text-xs text-gray-500 mt-2">{kpis.pending_returns} pending</p>
                </div>
                <span className="text-3xl">🔄</span>
              </div>
            </div>
          </div>
        )}

        {/* Second Row KPI Cards */}
        {kpis && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* New Customers */}
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-600">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 font-medium">New Customers</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{kpis.new_customers}</p>
                  <p className="text-xs text-gray-500 mt-2">Last {days} days</p>
                </div>
                <span className="text-3xl">👥</span>
              </div>
            </div>

            {/* Total Customers */}
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-600">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Customers</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{kpis.total_customers}</p>
                  <p className="text-xs text-gray-500 mt-2">All time</p>
                </div>
                <span className="text-3xl">👫</span>
              </div>
            </div>

            {/* Payment Success Rate */}
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-teal-600">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Payment Success</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{Number(kpis.payment_success_rate).toFixed(1)}%</p>
                  <p className="text-xs text-gray-500 mt-2">Success rate</p>
                </div>
                <span className="text-3xl">✅</span>
              </div>
            </div>

            {/* Conversion Rate */}
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-pink-600">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Period Performance</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{days} Days</p>
                  <p className="text-xs text-gray-500 mt-2">Data range</p>
                </div>
                <span className="text-3xl">📅</span>
              </div>
            </div>
          </div>
        )}

        {/* Order Trend Chart */}
        {orderAnalytics && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Order Trend</h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Orders</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Revenue</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {orderAnalytics.order_trend.slice(-10).map((metric, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900">{new Date(metric.date).toLocaleDateString()}</td>
                      <td className="text-right py-3 px-4 text-gray-900 font-medium">{metric.orders}</td>
                      <td className="text-right py-3 px-4 text-gray-900 font-medium">₹{metric.revenue.toFixed(0)}</td>
                      <td className="text-center py-3 px-4">
                        {metric.orders > 0 ? (
                          <span className="text-green-600 font-semibold">↑</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Order Status Breakdown */}
        {orderAnalytics && Object.keys(orderAnalytics.orders_by_status).length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Order Status Breakdown</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(orderAnalytics.orders_by_status).map(([status, count]) => (
                <div key={status} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 font-medium mb-2">{status}</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <div className="mt-3 bg-gray-300 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${((count as number) / (orderAnalytics.total_orders || 1)) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {(((count as number) / (orderAnalytics.total_orders || 1)) * 100).toFixed(1)}% of total
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
