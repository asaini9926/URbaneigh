import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import { logout } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';
import { Package, LogOut, User as UserIcon, MapPin } from 'lucide-react';

const Profile = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get('/orders/my-orders');
        setOrders(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  if (!user) return <div>Please login</div>;

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Account</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Sidebar / Profile Card */}
            <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                    <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto flex items-center justify-center mb-4 text-gray-500">
                        <UserIcon size={32} />
                    </div>
                    <h2 className="text-xl font-bold">{user.name}</h2>
                    <p className="text-gray-500 text-sm mb-6">{user.email}</p>
                    
                    <button 
                        onClick={handleLogout}
                        className="w-full border border-red-200 text-red-600 py-2 rounded-md hover:bg-red-50 flex items-center justify-center gap-2"
                    >
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </div>

            {/* Main Content: Order History */}
            <div className="lg:col-span-3">
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                        <Package className="text-black" />
                        <h2 className="text-lg font-bold">Order History</h2>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-400">Loading orders...</div>
                    ) : orders.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-gray-500 mb-4">You haven't placed any orders yet.</p>
                            <button onClick={() => navigate('/')} className="text-black underline font-medium">Start Shopping</button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {orders.map((order: any) => (
                                <div key={order.id} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex flex-col sm:flex-row justify-between mb-4">
                                        <div>
                                            <span className="text-sm text-gray-500">Order #{order.orderNumber}</span>
                                            <p className="text-xs text-gray-400">Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <div className="mt-2 sm:mt-0 text-right">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold 
                                                ${order.status === 'VERIFIED' ? 'bg-green-100 text-green-800' : 
                                                  order.status === 'PAYMENT_VERIFICATION_PENDING' ? 'bg-orange-100 text-orange-800' : 
                                                  order.status === 'DELIVERED' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {order.status.replace(/_/g, ' ')}
                                            </span>
                                            <p className="font-bold mt-1">₹{order.totalAmount}</p>
                                        </div>
                                    </div>

                                    {/* Order Items Preview */}
                                    <div className="space-y-2">
                                        {order.items.map((item: any) => (
                                            <div key={item.id} className="flex items-center gap-4 text-sm text-gray-600">
                                                <div className="w-10 h-10 bg-gray-200 rounded overflow-hidden">
                                                    {/* In future, save snapshot of image in order_items table */}
                                                    <div className="w-full h-full bg-gray-300" /> 
                                                </div>
                                                <span className="font-medium text-black">{item.quantity}x</span>
                                                <span>{item.variant?.sku || 'Product'}</span>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {order.status === 'PAYMENT_VERIFICATION_PENDING' && (
                                        <div className="mt-4 bg-yellow-50 p-3 rounded text-xs text-yellow-800">
                                            <span className="font-bold">Note:</span> Your payment is being verified by our team. This usually takes 1-2 hours.
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;