import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';


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
  paymentMethod: string;
  shippingAddress: any;
  items: OrderItem[];
  createdAt: string;
  delivered_at?: string;
}

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/orders/my-orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(response.data.orders || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      CREATED: 'bg-yellow-100 text-yellow-800',
      PAYMENT_PENDING: 'bg-blue-100 text-blue-800',
      PAID: 'bg-green-100 text-green-800',
      READY_TO_PICK: 'bg-orange-100 text-orange-800',
      PICKED_UP: 'bg-indigo-100 text-indigo-800',
      IN_TRANSIT: 'bg-purple-100 text-purple-800',
      OUT_FOR_DELIVERY: 'bg-pink-100 text-pink-800',
      DELIVERED: 'bg-green-200 text-green-900',
      CANCELLED: 'bg-red-100 text-red-800',
      RETURN_REQUESTED: 'bg-orange-200 text-orange-900',
      RETURNED: 'bg-red-200 text-red-900',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Order History</h1>

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Loading orders...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {!loading && orders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No orders found</p>
              <button
                onClick={() => navigate('/shop')}
                className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
              >
                Continue Shopping
              </button>
            </div>
          )}

          {!loading && orders.length > 0 && (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order.orderNumber}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Amount</p>
                      <p className="text-lg font-semibold text-gray-900">₹{order.totalAmount}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Payment Method</p>
                      <p className="text-lg font-semibold text-gray-900">{order.paymentMethod}</p>
                    </div>
                  </div>

                  {order.items && order.items.length > 0 && (
                    <div className="border-t pt-4 mb-4">
                      <p className="text-sm font-semibold text-gray-900 mb-2">
                        Items ({order.items.length})
                      </p>
                      <p className="text-sm text-gray-600">
                        {order.items.map((item, idx) => (
                          <span key={idx}>
                            Variant #{item.variantId} x{item.quantity}
                            {idx < order.items.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/order/${order.id}`)}
                      className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
                    >
                      View Details
                    </button>
                    {order.status === 'DELIVERED' && (
                      <button
                        onClick={() => navigate(`/return/${order.id}`)}
                        className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition text-sm font-medium"
                      >
                        Return Item
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
