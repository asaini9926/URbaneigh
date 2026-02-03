import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { CheckCircle, XCircle, Eye, Clock } from "lucide-react";

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const navigate = useNavigate();

  const fetchOrders = async () => {
    try {
      const res = await api.get("/orders/admin/all");
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getFulfillmentStatus = (order: any) => {
    // Need logic or mapping. Since we don't track fulfillment specifically yet (just 'status'), 
    // we'll map status to what looks like fulfillment
    // 'VERIFIED' -> 'Unfulfilled' (Ready to pack)
    // 'SHIPPED' -> 'Fulfilled' 
    // 'DELIVERED' -> 'Fulfilled'
    if (order.status === 'DELIVERED' || order.status === 'SHIPPED') return 'fulfilled';
    return 'unfulfilled';
  };

  const getPaymentStatus = (order: any) => {
    // Simple mapping
    if (order.payment?.status === 'COMPLETED') return 'paid';
    if (order.payment?.status === 'PENDING') return 'pending';
    return 'voided';
  };

  if (loading) return <div>Loading Admin Panel...</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Orders</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200 bg-white px-4">
          <div className="flex gap-6">
            {['all', 'unfulfilled', 'unpaid', 'open', 'closed'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
            <tr>
              <th className="p-4 w-10"><input type="checkbox" className="rounded border-gray-300" /></th>
              <th className="p-4">Order</th>
              <th className="p-4">Date</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Total</th>
              <th className="p-4">Payment</th>
              <th className="p-4">Fulfillment</th>
              <th className="p-4">Items</th>
              <th className="p-4">Delivery Method</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((order: any) => {
              const payStatus = getPaymentStatus(order);
              const fulfillStatus = getFulfillmentStatus(order);
              const itemCount = order.items.reduce((acc: number, item: any) => acc + item.quantity, 0);

              return (
                <tr
                  key={order.id}
                  onClick={() => navigate(`/admin/orders/${order.id}`)}
                  className="hover:bg-gray-50 group cursor-pointer transition-colors"
                >
                  <td className="p-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="rounded border-gray-300" /></td>
                  <td className="p-4 font-bold text-gray-900">
                    #{order.orderNumber.split('-')[1]}
                  </td>
                  <td className="p-4 text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </td>
                  <td className="p-4 font-medium text-gray-900">
                    {order.user.name}
                  </td>
                  <td className="p-4 text-gray-600">₹{order.totalAmount}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize 
                              ${payStatus === 'paid' ? 'bg-gray-100 text-gray-800' :
                        payStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                      {payStatus === 'paid' ? <CheckCircle size={10} className="mr-1" /> : <Clock size={10} className="mr-1" />}
                      {payStatus}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize 
                              ${fulfillStatus === 'fulfilled' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {fulfillStatus}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500">{itemCount} items</td>
                  <td className="p-4 text-gray-500 text-xs uppercase">{order.paymentMethod}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {orders.length === 0 && (
          <div className="p-12 text-center text-gray-500">No orders found.</div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
