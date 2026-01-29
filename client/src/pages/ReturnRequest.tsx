import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

interface OrderItem {
  variantId: number;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  orderNumber: string;
  totalAmount: number;
  status: string;
  items: OrderItem[];
  delivered_at: string;
}

export default function ReturnRequest() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    reason: '',
    description: '',
    selectedItems: [] as number[],
  });

  const returnReasons = [
    'DAMAGED',
    'DEFECTIVE',
    'NOT_AS_DESCRIBED',
    'WRONG_ITEM',
    'QUALITY_ISSUE',
    'SIZE_MISMATCH',
    'OTHER',
  ];

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/orders/${orderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrder(response.data.order);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleItemToggle = (variantId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.includes(variantId)
        ? prev.selectedItems.filter(id => id !== variantId)
        : [...prev.selectedItems, variantId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.reason) {
      setError('Please select a reason');
      return;
    }

    if (formData.selectedItems.length === 0) {
      setError('Please select at least one item to return');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const token = localStorage.getItem('token');
      const items = order!.items
        .filter(item => formData.selectedItems.includes(item.variantId))
        .map(item => ({
          variantId: item.variantId,
          quantity: item.quantity,
          reason: formData.reason,
        }));

      const response = await axios.post(
        'http://localhost:5000/api/returns/create',
        {
          orderId: parseInt(orderId!),
          reason: formData.reason,
          description: formData.description,
          items,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(true);
      setTimeout(() => {
        navigate(`/return-tracking/${response.data.return_id}`);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create return request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading order...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!order || order.status !== 'DELIVERED') {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 text-lg mb-4">
              {!order ? 'Order not found' : 'This order cannot be returned'}
            </p>
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

  const daysLeft = Math.ceil(
    (14 - (Date.now() - new Date(order.delivered_at).getTime()) / (1000 * 60 * 60 * 24))
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate('/order-history')}
            className="text-indigo-600 hover:text-indigo-700 mb-6 flex items-center gap-2"
          >
            ← Back to Orders
          </button>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Return Item</h1>
            <p className="text-gray-600 mb-6">
              Order #{order.orderNumber} • {daysLeft} days left to return
            </p>

            {daysLeft <= 0 && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                The 14-day return window for this order has expired.
              </div>
            )}

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
                Return request submitted successfully! Redirecting...
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Select Items */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Select Items to Return
                </h2>
                <div className="space-y-3">
                  {order.items.map((item, idx) => (
                    <label
                      key={idx}
                      className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.selectedItems.includes(item.variantId)}
                        onChange={() => handleItemToggle(item.variantId)}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <div className="ml-4 flex-1">
                        <p className="font-medium text-gray-900">
                          Variant #{item.variantId}
                        </p>
                        <p className="text-sm text-gray-600">
                          Quantity: {item.quantity}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">₹{item.price}</p>
                    </label>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Reason for Return *
                </label>
                <select
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                >
                  <option value="">Select a reason</option>
                  {returnReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Provide more details about the return..."
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                />
              </div>

              {/* Return Summary */}
              {formData.selectedItems.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-gray-600">
                    Items to return: {formData.selectedItems.length}
                  </p>
                  <p className="text-lg font-semibold text-blue-700 mt-2">
                    Estimated Refund: ₹
                    {order.items
                      .filter(item => formData.selectedItems.includes(item.variantId))
                      .reduce((sum, item) => sum + item.price, 0)}
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || daysLeft <= 0}
                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-medium transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Return Request'}
              </button>
            </form>

            {/* Info Box */}
            <div className="mt-8 p-4 bg-gray-50 rounded border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Return Process</h3>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. Submit your return request</li>
                <li>2. We'll review and approve your return</li>
                <li>3. Schedule a pickup with our courier</li>
                <li>4. Send the item back</li>
                <li>5. Receive your refund (3-5 business days)</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
