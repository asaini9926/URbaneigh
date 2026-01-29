import { useEffect, useState } from 'react';
import axios from 'axios';

interface ReturnRequest {
  return_id: number;
  order_number: string;
  customer_name: string;
  reason: string;
  requested_at: string;
  status: string;
  estimated_refund: number;
  approved_refund?: number;
}

export default function AdminReturns() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('REQUESTED');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchReturns();
  }, [filter, page]);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/returns/admin/list?status=${filter}&page=${page}&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReturns(response.data.returns || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (returnId: number) => {
    try {
      const token = localStorage.getItem('token');
      const approvedAmount = prompt(
        'Enter approved refund amount:',
        returns.find(r => r.return_id === returnId)?.estimated_refund.toString()
      );

      if (approvedAmount) {
        await axios.post(
          `http://localhost:5000/api/returns/admin/approve/${returnId}`,
          { approvedRefundAmount: parseFloat(approvedAmount), notes: 'Admin approved' },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        fetchReturns();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to approve return');
    }
  };

  const handleReject = async (returnId: number) => {
    try {
      const token = localStorage.getItem('token');
      const reason = prompt('Enter rejection reason:');

      if (reason) {
        await axios.post(
          `http://localhost:5000/api/returns/admin/reject/${returnId}`,
          { rejectionReason: reason },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        fetchReturns();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reject return');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      REQUESTED: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      PICKUP_SCHEDULED: 'bg-blue-100 text-blue-800',
      IN_TRANSIT: 'bg-purple-100 text-purple-800',
      RECEIVED: 'bg-indigo-100 text-indigo-800',
      RETURNED: 'bg-green-200 text-green-900',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Return Management</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Filter */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {['REQUESTED', 'APPROVED', 'REJECTED', 'RETURNED'].map(status => (
          <button
            key={status}
            onClick={() => {
              setFilter(status);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === status
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
            }`}
          >
            {status.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : returns.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          No returns found for this filter
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Return ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Order</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Customer</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Reason</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Requested</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Refund Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {returns.map(ret => (
                <tr key={ret.return_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">#{ret.return_id}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{ret.order_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{ret.customer_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{ret.reason}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(ret.requested_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    ₹{ret.approved_refund || ret.estimated_refund}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(ret.status)}`}>
                      {ret.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {ret.status === 'REQUESTED' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(ret.return_id)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(ret.return_id)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
