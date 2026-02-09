import { useEffect, useState } from 'react';
import axios from 'axios';

interface PendingOrder {
  order_id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  amount: number;
  delivered_at: string;
  payment_received: boolean;
}

interface SettlementSummary {
  period: string;
  total_orders: number;
  total_expected_amount: number;
  paid_orders: number;
  paid_amount: number;
  unpaid_orders: number;
  unpaid_amount: number;
  settlement_percentage: string;
}

interface Alert {
  alert_id: number;
  order_id: number;
  order_number: string;
  alert_type: string;
  expected_amount: number;
  actual_amount: number;
  difference: number;
  status: string;
  created_at: string;
}

export default function AdminReconciliation() {
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [settlement, setSettlement] = useState<SettlementSummary | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('daily');
  const [activeTab, setActiveTab] = useState<'pending' | 'settlement' | 'alerts'>('pending');

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [pendingRes, settlementRes, alertsRes] = await Promise.all([
        axios.get('import.meta.env.VITE_API_URL/reconciliation/pending-orders?page=1&limit=20', {
          headers,
        }),
        axios.get(`import.meta.env.VITE_API_URL/reconciliation/settlement-summary?period=${period}`, {
          headers,
        }),
        axios.get('import.meta.env.VITE_API_URL/reconciliation/alerts?status=OPEN&page=1&limit=20', {
          headers,
        }),
      ]);

      setPendingOrders(pendingRes.data.orders || []);
      setSettlement(settlementRes.data);
      setAlerts(alertsRes.data.alerts || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load reconciliation data');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (orderId: number, amount: number) => {
    try {
      const referenceId = prompt('Enter courier reference ID:');
      if (!referenceId) return;

      const token = localStorage.getItem('token');
      await axios.post(
        'import.meta.env.VITE_API_URL/reconciliation/record-payment',
        {
          orderId,
          amount,
          referenceId,
          courierRemittanceDate: new Date().toISOString().split('T')[0],
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record payment');
    }
  };

  const handleResolveAlert = async (alertId: number) => {
    try {
      const resolution = prompt('Enter resolution notes:');
      if (!resolution) return;

      const token = localStorage.getItem('token');
      await axios.post(
        `import.meta.env.VITE_API_URL/reconciliation/alerts/${alertId}/resolve`,
        { resolution },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to resolve alert');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">COD Reconciliation</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {settlement && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Total Orders</p>
            <p className="text-3xl font-bold text-gray-900">{settlement.total_orders}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Total Expected Amount</p>
            <p className="text-2xl font-bold text-gray-900">₹{settlement.total_expected_amount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Paid Orders</p>
            <p className="text-3xl font-bold text-green-600">{settlement.paid_orders}</p>
            <p className="text-sm text-gray-500">₹{settlement.paid_amount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Settlement %</p>
            <p className="text-3xl font-bold text-indigo-600">{settlement.settlement_percentage}%</p>
          </div>
        </div>
      )}

      {/* Period Selector */}
      <div className="mb-6 flex gap-2">
        {['daily', 'weekly', 'monthly'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              period === p
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b">
        {(['pending', 'settlement', 'alerts'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'pending' && `Pending Orders (${pendingOrders.length})`}
            {tab === 'settlement' && 'Settlement'}
            {tab === 'alerts' && `Alerts (${alerts.length})`}
          </button>
        ))}
      </div>

      {/* Pending Orders Tab */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {pendingOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              All COD orders have been settled!
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Order</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Customer</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Delivered</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingOrders.map(order => (
                  <tr key={order.order_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{order.order_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>{order.customer_name}</div>
                      <div className="text-xs text-gray-500">{order.customer_phone}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">₹{order.amount}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(order.delivered_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        order.payment_received
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.payment_received ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {!order.payment_received && (
                        <button
                          onClick={() => handleRecordPayment(order.order_id, order.amount)}
                          className="bg-indigo-600 text-white px-3 py-1 rounded text-xs hover:bg-indigo-700"
                        >
                          Record Payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {alerts.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              No alerts at this time
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Alert ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Order</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Expected</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actual</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Diff</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Created</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {alerts.map(alert => (
                  <tr key={alert.alert_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">#{alert.alert_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{alert.order_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{alert.alert_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">₹{alert.expected_amount}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">₹{alert.actual_amount}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-red-600">₹{alert.difference}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(alert.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {alert.status === 'OPEN' && (
                        <button
                          onClick={() => handleResolveAlert(alert.alert_id)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                        >
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
