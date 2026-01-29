import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

interface Return {
  return_id: number;
  order_id: number;
  status: string;
  reason: string;
  description?: string;
  requested_at: string;
  approved_at?: string;
  completed_at?: string;
  estimated_refund?: number;
  approved_refund?: number;
  return_waybill?: string;
  pickup_scheduled?: string;
  estimated_delivery?: string;
  latest_update?: {
    status: string;
    timestamp: string;
    location?: string;
  };
}

export default function ReturnTracking() {
  const { returnId } = useParams();
  const navigate = useNavigate();
  const [returnData, setReturnData] = useState<Return | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReturnDetails();
    const interval = setInterval(fetchReturnDetails, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [returnId]);

  const fetchReturnDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/returns/details/${returnId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReturnData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load return details');
    } finally {
      setLoading(false);
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

  const getStatusStep = (status: string) => {
    const steps = ['REQUESTED', 'APPROVED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'RECEIVED', 'RETURNED'];
    return steps.indexOf(status);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading return details...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !returnData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 text-lg mb-4">{error || 'Return not found'}</p>
            <button
              onClick={() => navigate('/order-history')}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
            >
              Back to Orders
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const currentStep = getStatusStep(returnData.status);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate('/order-history')}
            className="text-indigo-600 hover:text-indigo-700 mb-6 flex items-center gap-2"
          >
            ← Back to Orders
          </button>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Return Tracking</h1>
                <p className="text-gray-600">Order #{returnData.order_id}</p>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(returnData.status)}`}>
                {returnData.status.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Return Status Timeline */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Return Status</h2>
              <div className="flex justify-between items-center">
                {[
                  { step: 0, label: 'Requested' },
                  { step: 1, label: 'Approved' },
                  { step: 2, label: 'Pickup Scheduled' },
                  { step: 3, label: 'In Transit' },
                  { step: 4, label: 'Received' },
                  { step: 5, label: 'Completed' },
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold mb-2 ${
                        currentStep >= item.step
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {currentStep >= item.step ? '✓' : item.step + 1}
                    </div>
                    <p className="text-xs text-gray-600 text-center">{item.label}</p>
                    {idx < 5 && (
                      <div
                        className={`h-1 w-full mt-2 ${
                          currentStep > item.step ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      ></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Return Details */}
            <div className="border-t pt-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Return Details</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Reason</p>
                  <p className="font-semibold text-gray-900">{returnData.reason.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-semibold text-gray-900">{returnData.status.replace(/_/g, ' ')}</p>
                </div>
              </div>

              {returnData.description && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600">Description</p>
                  <p className="font-medium text-gray-900">{returnData.description}</p>
                </div>
              )}
            </div>

            {/* Refund Information */}
            {(returnData.estimated_refund || returnData.approved_refund) && (
              <div className="border-t pt-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Refund Amount</h2>
                <div className="grid grid-cols-2 gap-6">
                  {returnData.estimated_refund && (
                    <div>
                      <p className="text-sm text-gray-600">Estimated Refund</p>
                      <p className="text-lg font-semibold text-gray-900">
                        ₹{returnData.estimated_refund}
                      </p>
                    </div>
                  )}
                  {returnData.approved_refund && (
                    <div>
                      <p className="text-sm text-gray-600">Approved Amount</p>
                      <p className="text-lg font-semibold text-green-600">
                        ₹{returnData.approved_refund}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tracking Information */}
            {returnData.return_waybill && (
              <div className="border-t pt-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Information</h2>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <p className="text-sm text-gray-600">Return Waybill</p>
                      <p className="font-semibold text-gray-900">{returnData.return_waybill}</p>
                    </div>
                    {returnData.latest_update && (
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Latest Update</p>
                        <p className="font-semibold text-gray-900">{returnData.latest_update.status}</p>
                      </div>
                    )}
                  </div>

                  {returnData.pickup_scheduled && (
                    <p className="text-sm text-gray-600">
                      Pickup Scheduled: {new Date(returnData.pickup_scheduled).toLocaleDateString()}
                    </p>
                  )}

                  {returnData.estimated_delivery && (
                    <p className="text-sm text-gray-600">
                      Estimated Delivery: {new Date(returnData.estimated_delivery).toLocaleDateString()}
                    </p>
                  )}

                  {returnData.latest_update?.timestamp && (
                    <p className="text-xs text-gray-500 mt-2">
                      Last update: {new Date(returnData.latest_update.timestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5 mr-3"></div>
                  <div>
                    <p className="font-medium text-gray-900">Return Requested</p>
                    <p className="text-sm text-gray-600">
                      {new Date(returnData.requested_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {returnData.approved_at && (
                  <div className="flex items-start">
                    <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5 mr-3"></div>
                    <div>
                      <p className="font-medium text-gray-900">Return Approved</p>
                      <p className="text-sm text-gray-600">
                        {new Date(returnData.approved_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {returnData.completed_at && (
                  <div className="flex items-start">
                    <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5 mr-3"></div>
                    <div>
                      <p className="font-medium text-gray-900">Return Completed</p>
                      <p className="text-sm text-gray-600">
                        {new Date(returnData.completed_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
