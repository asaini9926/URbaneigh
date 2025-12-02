import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { DollarSign, ShoppingBag, Users, AlertTriangle } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/stats');
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div>Loading Dashboard...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Store Overview</h1>

      {/* 1. Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        <div className="bg-black text-white p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-gray-400 text-sm font-medium uppercase">Total Revenue</p>
                    <h3 className="text-3xl font-bold mt-2">₹{stats.revenue}</h3>
                </div>
                <div className="bg-gray-800 p-2 rounded-md">
                    <DollarSign size={24} />
                </div>
            </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-gray-500 text-sm font-medium uppercase">Total Orders</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.totalOrders}</h3>
                </div>
                <div className="bg-blue-50 text-blue-600 p-2 rounded-md">
                    <ShoppingBag size={24} />
                </div>
            </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-gray-500 text-sm font-medium uppercase">Active Customers</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCustomers}</h3>
                </div>
                <div className="bg-green-50 text-green-600 p-2 rounded-md">
                    <Users size={24} />
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 2. Recent Orders Table */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="font-bold text-lg mb-4">Recent Orders</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium">
                        <tr>
                            <th className="p-3">Order ID</th>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {stats.recentOrders.map((order: any) => (
                            <tr key={order.id}>
                                <td className="p-3 font-medium">{order.orderNumber}</td>
                                <td className="p-3">{order.user.name}</td>
                                <td className="p-3">₹{order.totalAmount}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold 
                                        ${order.status === 'VERIFIED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {order.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* 3. Low Stock Alerts */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-500" /> Low Stock Alerts
            </h3>
            {stats.lowStock.length === 0 ? (
                <p className="text-gray-500">Inventory looks good.</p>
            ) : (
                <ul className="space-y-4">
                    {stats.lowStock.map((v: any) => (
                        <li key={v.id} className="flex justify-between items-center border-b pb-2">
                            <div>
                                <p className="font-medium text-gray-900">{v.product.title}</p>
                                <p className="text-xs text-gray-500">{v.color} - {v.size} ({v.sku})</p>
                            </div>
                            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold">
                                {v.inventory.quantity} left
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;