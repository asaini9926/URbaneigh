import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import { logout, loginSuccess } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';
import { Package, LogOut, User as UserIcon, MapPin, Plus, Trash2, CheckCircle } from 'lucide-react';

// Helper Component for Address Form
const AddressForm = ({ onSubmit, onCancel }: { onSubmit: (e: any, data: any) => void; onCancel: () => void }) => {
    const [formData, setFormData] = useState({ name: '', fullAddress: '', pincode: '', city: '', state: '', isDefault: false });
    const [locating, setLocating] = useState(false);

    const handleLocation = () => {
        if (!navigator.geolocation) return alert("Geolocation not supported");
        setLocating(true);
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const { latitude, longitude } = pos.coords;
                const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
                if (!apiKey) {
                    alert("Google Maps API Key missing");
                    return;
                }
                const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`);
                const data = await res.json();
                if (data.results?.[0]) {
                    const addrComponents = data.results[0].address_components;
                    let city = "", pincode = "", state = "";
                    addrComponents.forEach((comp: any) => {
                        if (comp.types.includes("locality")) city = comp.long_name;
                        if (comp.types.includes("postal_code")) pincode = comp.long_name;
                        if (comp.types.includes("administrative_area_level_1")) state = comp.long_name;
                    });
                    setFormData(prev => ({
                        ...prev,
                        fullAddress: data.results[0].formatted_address,
                        city: city || prev.city,
                        pincode: pincode || prev.pincode,
                        state: state || prev.state
                    }));
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLocating(false);
            }
        }, () => {
            alert("Location access denied");
            setLocating(false);
        });
    };

    return (
        <form onSubmit={(e) => onSubmit(e, formData)} className="space-y-3 mb-6 bg-gray-50 p-4 rounded-md border border-gray-200">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-bold text-gray-700">Add New Address</h4>
                <button type="button" onClick={handleLocation} disabled={locating} className="text-xs flex items-center gap-1 text-blue-600 hover:underline">
                    {locating ? 'Locating...' : <><MapPin size={12} /> Use Current Location</>}
                </button>
            </div>
            <input required placeholder="Recipient Name" className="w-full text-sm p-2 border rounded" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            <input required placeholder="Address Line" className="w-full text-sm p-2 border rounded" value={formData.fullAddress} onChange={e => setFormData({ ...formData, fullAddress: e.target.value })} />
            <div className="flex gap-2">
                <input required placeholder="City" className="w-1/2 text-sm p-2 border rounded" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                <input required placeholder="Pincode" className="w-1/2 text-sm p-2 border rounded" value={formData.pincode} onChange={e => setFormData({ ...formData, pincode: e.target.value })} />
            </div>
            <input required placeholder="State" className="w-full text-sm p-2 border rounded" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} />
            <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={formData.isDefault} onChange={e => setFormData({ ...formData, isDefault: e.target.checked })} />
                Set as Default
            </label>
            <div className="flex gap-2">
                <button type="button" onClick={onCancel} className="flex-1 bg-white border border-gray-300 text-gray-700 text-xs py-2 rounded hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 bg-black text-white text-xs py-2 rounded hover:bg-gray-800">Save Address</button>
            </div>
        </form>
    );
};

const Profile = () => {
    const { user } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [addresses, setAddresses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Address Form State
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [newAddress, setNewAddress] = useState({ name: '', fullAddress: '', pincode: '', city: '', state: '', isDefault: false });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [orderRes, profileRes] = await Promise.all([
                api.get('/orders/my-orders'),
                api.get('/user/profile')
            ]);
            setOrders(orderRes.data);
            setAddresses(profileRes.data.addresses || []);

            // Update Redux user state if name changed
            if (profileRes.data.name !== user?.name) {
                // Dispatch update if we had a way to just update name, for now we can update the whole user object
                // but we need the token. Actually we can just proceed.
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    const handleAddAddress = async (e: React.FormEvent, data: any) => {
        e.preventDefault();
        try {
            await api.post('/user/address', data);
            setShowAddressForm(false);
            setNewAddress({ name: '', fullAddress: '', pincode: '', city: '', state: '', isDefault: false });
            fetchData(); // Refresh list
        } catch (err) {
            console.error("Failed to add address", err);
            alert("Failed to add address");
        }
    };

    const handleSetDefault = async (addressId: number, name: string) => {
        try {
            await api.put(`/user/address/${addressId}/default`, { name }); // Send name to update user profile
            fetchData();
        } catch (err) {
            console.error("Failed to set default", err);
        }
    };

    const handleDeleteAddress = async (addressId: number) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            await api.delete(`/user/address/${addressId}`);
            fetchData();
        } catch (err) {
            console.error("Failed to delete", err);
        }
    };

    if (!user) return <div>Please login</div>;

    return (
        <div className="bg-gray-50 min-h-screen py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">My Account</h1>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* Sidebar / Profile Card */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                            <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto flex items-center justify-center mb-4 text-gray-500">
                                <UserIcon size={32} />
                            </div>
                            <h2 className="text-xl font-bold">{user.name || 'User'}</h2>
                            <p className="text-gray-500 text-sm mb-6">{user.phone}</p>

                            <button
                                onClick={handleLogout}
                                className="w-full border border-red-200 text-red-600 py-2 rounded-md hover:bg-red-50 flex items-center justify-center gap-2"
                            >
                                <LogOut size={16} /> Sign Out
                            </button>
                        </div>

                        {/* Address Book Widget (Sidebar) */}
                        <div className="bg-white p-6 rounded-lg shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold">Addresses</h3>
                                <button onClick={() => setShowAddressForm(!showAddressForm)} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                    <Plus size={14} /> Add
                                </button>
                            </div>

                            {showAddressForm && (
                                <AddressForm
                                    onSubmit={handleAddAddress}
                                    onCancel={() => setShowAddressForm(false)}
                                />
                            )}

                            <div className="space-y-4">
                                {addresses.map((addr: any) => (
                                    <div key={addr.id} className={`border rounded-md p-3 relative group ${addr.isDefault ? 'border-blue-500 bg-blue-50' : 'border-gray-100'}`}>
                                        {addr.isDefault && <span className="absolute top-2 right-2 text-blue-500"><CheckCircle size={14} /></span>}
                                        <p className="text-sm font-medium">{addr.fullAddress}</p>
                                        <p className="text-xs text-gray-500">{addr.city}, {addr.state} - {addr.pincode}</p>

                                        <div className="mt-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!addr.isDefault && (
                                                <button onClick={() => handleSetDefault(addr.id, addr.name || 'User')} className="text-xs text-blue-600 hover:underline">Set Default</button>
                                            )}
                                            <button onClick={() => handleDeleteAddress(addr.id)} className="text-xs text-red-600 hover:underline"><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
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