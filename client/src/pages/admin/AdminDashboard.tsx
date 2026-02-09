import { useEffect, useState } from 'react';
import api from '../../api/axios';
import {
    DollarSign, ShoppingBag, Users, ShoppingCart, Activity,
    ArrowUpRight, ArrowDownRight, Package, Truck, CreditCard, RefreshCw
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend, LineChart, Line
} from 'recharts';

const AdminDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    // State for all metrics
    const [kpis, setKpis] = useState<any>(null);
    const [orderMetrics, setOrderMetrics] = useState<any>(null);
    const [revenueMetrics, setRevenueMetrics] = useState<any>(null);
    const [productMetrics, setProductMetrics] = useState<any>(null);
    const [fulfillmentMetrics, setFulfillmentMetrics] = useState<any>(null);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                // Parallel fetch for speed
                const [kpiRes, orderRes, revRes, prodRes, fulfillRes] = await Promise.all([
                    api.get('/analytics/kpi', { params: { days } }),
                    api.get('/analytics/orders', { params: { days } }),
                    api.get('/analytics/revenue', { params: { days } }),
                    api.get('/analytics/products', { params: { days } }),
                    api.get('/analytics/fulfillment', { params: { days } })
                ]);

                if (kpiRes.data.success) setKpis(kpiRes.data.kpis);
                if (orderRes.data.success) setOrderMetrics(orderRes.data.metrics);
                if (revRes.data.success) setRevenueMetrics(revRes.data.metrics);
                if (prodRes.data.success) setProductMetrics(prodRes.data.metrics);
                if (fulfillRes.data.success) setFulfillmentMetrics(fulfillRes.data.metrics);

            } catch (error) {
                console.error("Failed to fetch dashboard analytics", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [days]);

    if (loading) return (
        <div className="flex justify-center items-center h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
        </div>
    );

    const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    return (
        <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
                    <p className="text-gray-500 text-sm">Real-time insights into your business performance</p>
                </div>

                <div className="flex items-center bg-white rounded-lg p-1 border border-gray-200 shadow-sm overflow-x-auto max-w-full">
                    {[
                        { label: 'Today', val: 1 },
                        { label: 'Week', val: 7 },
                        { label: 'Month', val: 30 },
                        { label: 'Year', val: 365 },
                        { label: 'Overall', val: 36500 }
                    ].map((opt) => (
                        <button
                            key={opt.val}
                            onClick={() => setDays(opt.val)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${days === opt.val
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 1. Primary KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Revenue Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-indigo-500 to-indigo-600"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Revenue</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">
                                ₹{kpis?.total_revenue?.toLocaleString()}
                            </h3>
                            <div className="mt-2 flex items-center text-xs font-medium text-green-600 bg-green-50 w-fit px-2 py-1 rounded-full">
                                <ArrowUpRight size={12} className="mr-1" />
                                {revenueMetrics?.net_margin_percent}% Margin
                            </div>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-xl group-hover:bg-indigo-100 transition-colors">
                            <DollarSign size={24} className="text-indigo-600" />
                        </div>
                    </div>
                </div>

                {/* Orders Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-blue-500 to-blue-600"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Orders</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">{kpis?.total_orders}</h3>
                            <p className="mt-2 text-xs text-gray-400">Avg Value: ₹{kpis?.avg_order_value}</p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-xl group-hover:bg-blue-100 transition-colors">
                            <ShoppingBag size={24} className="text-blue-600" />
                        </div>
                    </div>
                </div>

                {/* Return Rate Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-red-500 to-red-600"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Return Rate</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">{kpis?.return_rate}%</h3>
                            <div className="mt-2 flex items-center text-xs font-medium text-red-600 bg-red-50 w-fit px-2 py-1 rounded-full">
                                <RefreshCw size={12} className="mr-1" />
                                {kpis?.pending_returns} Pending
                            </div>
                        </div>
                        <div className="bg-red-50 p-3 rounded-xl group-hover:bg-red-100 transition-colors">
                            <ArrowDownRight size={24} className="text-red-600" />
                        </div>
                    </div>
                </div>

                {/* Payment Success Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-emerald-500 to-emerald-600"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Payment Success</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">{kpis?.payment_success_rate}%</h3>
                            <div className="mt-2 flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-full">
                                <CreditCard size={12} className="mr-1" />
                                Gateway Health
                            </div>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-xl group-hover:bg-emerald-100 transition-colors">
                            <Activity size={24} className="text-emerald-600" />
                        </div>
                    </div>
                </div>

            </div>

            {/* 2. Charts Section - Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Revenue Trend Area Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-gray-800">Revenue Growth</h3>
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">Daily Trend</span>
                    </div>
                    <div className="h-80 w-full">
                        {orderMetrics?.order_trend?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={orderMetrics.order_trend}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFF6FF" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: '#9CA3AF' }}
                                        tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={(val) => `₹${val / 1000}k`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={3} fill="url(#colorRev)" activeDot={{ r: 6 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                No revenue data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Categories - Bar Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-lg mb-6 text-gray-800">Top Categories</h3>
                    <div className="h-80 w-full">
                        {productMetrics?.category_distribution?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={productMetrics.category_distribution} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={90} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#4B5563' }} />
                                    <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px' }} />
                                    <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={24}>
                                        {productMetrics.category_distribution.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                No category data available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. Detailed Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Fulfillment Stats */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center">
                        <Truck className="mr-2 text-indigo-500" size={20} /> Fulfillment
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-600">Avg Delivery</span>
                            <span className="text-lg font-bold text-indigo-700">{fulfillmentMetrics?.avg_delivery_time_days || 0} Days</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-600">SLA Breaches</span>
                            <span className="text-lg font-bold text-red-700">{fulfillmentMetrics?.sla_breaches || 0}</span>
                        </div>
                        <div className="relative pt-2">
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <span>Successful Deliveries</span>
                                <span>{(fulfillmentMetrics?.total_shipments || 0)} Total</span>
                            </div>
                            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                                <div style={{ width: '85%' }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Selling Products */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center">
                        <Package className="mr-2 text-orange-500" size={20} /> Top Selling Products
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">Product Name</th>
                                    <th className="px-4 py-3 text-right">Sold</th>
                                    <th className="px-4 py-3 text-right">Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productMetrics?.top_selling_products?.slice(0, 5).map((product: any, idx: number) => (
                                    <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">{product.title}</td>
                                        <td className="px-4 py-3 text-right">{product.sold_quantity}</td>
                                        <td className="px-4 py-3 text-right">₹{product.revenue.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {(!productMetrics?.top_selling_products || productMetrics.top_selling_products.length === 0) && (
                                    <tr><td colSpan={3} className="text-center py-4">No sales data</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* 4. Order Status Distribution */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-lg mb-6 text-gray-800">Order Status Distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {orderMetrics?.orders_by_status && Object.entries(orderMetrics.orders_by_status).map(([status, count]: [string, any]) => (
                        <div key={status} className="bg-gray-50 p-4 rounded-xl text-center border border-gray-100">
                            <p className="text-xs text-gray-500 font-semibold uppercase">{status}</p>
                            <p className="text-xl font-bold text-gray-900 mt-1">{count}</p>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default AdminDashboard;