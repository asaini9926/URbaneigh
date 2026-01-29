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

interface Shipment {
  id: number;
  waybill: string;
  status: string;
  courier_provider: string;
  estimated_delivery: string;
  last_tracking_update: string;
}

interface OrderDetail {
  id: number;
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  items: OrderItem[];
  payment?: {
    status: string;
    refund_amount?: number;
    refunded_at?: string;
  };
  shipments?: Shipment[];
  delivered_at?: string;
  createdAt: string;
}

export default function OrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/orders/${orderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrder(response.data.order);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStep = (status: string) => {
    const steps = [
      'CREATED',
      'PAYMENT_PENDING',
      'PAID',
      'READY_TO_PICK',
      'PICKED_UP',
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ];
    return steps.indexOf(status);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading order details...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 text-lg mb-4">{error || 'Order not found'}</p>
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

  const currentStep = getStatusStep(order.status);

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

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Order #{order.orderNumber}
                </h1>
                <p className="text-gray-600">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">₹{order.totalAmount}</p>
              </div>
            </div>

            {/* Order Status Timeline */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Status</h2>
              <div className="flex justify-between items-center">
                {[
                  { step: 1, label: 'Order Placed' },
                  { step: 2, label: 'Paid' },
                  { step: 3, label: 'Processing' },
                  { step: 4, label: 'In Transit' },
                  { step: 5, label: 'Delivered' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center flex-1"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold mb-2 ${
                        currentStep >= idx
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      ✓
                    </div>
                    <p className="text-xs text-gray-600 text-center">{item.label}</p>
                    {idx < 4 && (
                      <div
                        className={`h-1 w-full mt-2 ${
                          currentStep > idx ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      ></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Status */}
            <div className="border-t pt-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Payment</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Payment Method</p>
                  <p className="font-semibold text-gray-900">{order.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-semibold text-gray-900">{order.payment?.status || 'Pending'}</p>
                </div>
              </div>

              {order.payment?.refund_amount && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-gray-600">Refund Amount</p>
                  <p className="font-semibold text-green-700">₹{order.payment.refund_amount}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Refunded on {new Date(order.payment.refunded_at!).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="border-t pt-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Items</h2>
              <div className="space-y-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-gray-900">Variant #{item.variantId}</p>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                    </div>
                    <p className="font-semibold text-gray-900">₹{item.price}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping */}
            {order.shipments && order.shipments.length > 0 && (
              <div className="border-t pt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Shipping</h2>
                {order.shipments.map((shipment, idx) => (
                  <div key={idx} className="p-4 bg-blue-50 rounded border border-blue-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {shipment.courier_provider}
                        </p>
                        <p className="text-sm text-gray-600">Waybill: {shipment.waybill}</p>
                      </div>
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm font-medium">
                        {shipment.status}
                      </span>
                    </div>
                    {shipment.estimated_delivery && (
                      <p className="text-sm text-gray-600">
                        Est. Delivery: {new Date(shipment.estimated_delivery).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {order.status === 'DELIVERED' && (
              <button
                onClick={() => navigate(`/return/${order.id}`)}
                className="flex-1 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 font-medium transition"
              >
                Return This Order
              </button>
            )}
            <button
              onClick={() => navigate('/order-history')}
              className="flex-1 bg-gray-200 text-gray-900 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium transition"
            >
              Back to Orders
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
