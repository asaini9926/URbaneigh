import { useEffect, useState } from "react";
import api from "../../api/axios";
import { CheckCircle, XCircle, Eye, Clock } from "lucide-react";

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleVerifyPayment = async (orderId: number) => {
    if (!window.confirm("Confirm that you have received the payment?")) return;

    try {
      await api.put(`/orders/${orderId}/status`, {
        status: "VERIFIED",
        paymentStatus: "COMPLETED",
      });
      alert("Payment Verified! Order marked as ready to pack.");
      fetchOrders(); // Refresh table
    } catch (err) {
      alert("Error updating order");
    }
  };

  if (loading) return <div>Loading Admin Panel...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Order Management
      </h1>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-900 font-bold border-b">
            <tr>
              <th className="p-4">Order ID</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Total</th>
              <th className="p-4">Payment</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((order: any) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="p-4 font-medium text-black">
                  {order.orderNumber}
                </td>
                <td className="p-4">
                  {order.user.name} <br />
                  <span className="text-xs text-gray-400">
                    {order.user.email}
                  </span>
                </td>
                <td className="p-4 font-bold">₹{order.totalAmount}</td>
                <td className="p-4">
                  <span className="block">{order.paymentMethod}</span>
                  {order.payment?.qrReference && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                      UTR: {order.payment.qrReference}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-bold 
                                ${
                                  order.status === "VERIFIED"
                                    ? "bg-green-100 text-green-800"
                                    : order.status ===
                                      "PAYMENT_VERIFICATION_PENDING"
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                  >
                    {order.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="p-4">
                  {order.status === "PAYMENT_VERIFICATION_PENDING" ? (
                    <button
                      onClick={() => handleVerifyPayment(order.id)}
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 flex items-center gap-1 text-xs"
                    >
                      <CheckCircle size={14} /> Verify
                    </button>
                  ) : (
                    <span className="text-gray-400 text-xs">No Actions</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminOrders;
