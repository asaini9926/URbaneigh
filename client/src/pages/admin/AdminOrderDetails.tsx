import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import {
    Truck, CreditCard, Package, AlertCircle, MapPin,
    RefreshCw, ExternalLink, Printer, Box
} from "lucide-react";

const AdminOrderDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Logistics State
    const [serviceability, setServiceability] = useState<any>(null);
    const [checkingService, setCheckingService] = useState(false);
    const [shippingLoading, setShippingLoading] = useState(false);

    // Dimensions for shipping
    const [dims, setDims] = useState({ length: 15, breadth: 15, height: 10, weight: 0.5 });

    // Refresh Payment State
    const [verifyingPayment, setVerifyingPayment] = useState(false);

    useEffect(() => {
        fetchOrder();
    }, [id]);

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/orders/admin/${id}`); // Use Admin route
            setOrder(res.data.order);
        } catch (err) {
            console.error(err);
            alert("Failed to fetch order");
        } finally {
            setLoading(false);
        }
    };

    const checkServiceability = async () => {
        if (!order) return;
        setCheckingService(true);
        try {
            const res = await api.post("/shipments/serviceability", {
                pickupPincode: "110001",
                deliveryPincode: order.shippingAddress.pincode,
                weight: dims.weight,
                cod: order.paymentMethod === 'COD'
            });
            setServiceability(res.data);
        } catch (err: any) {
            alert(err.response?.data?.error || "Serviceability check failed");
        } finally {
            setCheckingService(false);
        }
    };

    const createShipment = async () => {
        if (!window.confirm("Are you sure you want to ship this order via Shiprocket?")) return;
        setShippingLoading(true);
        try {
            await api.post("/shipments/create", {
                orderId: order.id,
                ...dims
            });
            alert("Shipment created successfully!");
            fetchOrder();
        } catch (err: any) {
            alert(err.response?.data?.error || "Failed to create shipment");
        } finally {
            setShippingLoading(false);
        }
    };

    const verifyPayment = async () => {
        setVerifyingPayment(true);
        try {
            const res = await api.post("/payments/verify", { orderId: order.id });
            alert(res.data.message);
            fetchOrder();
        } catch (err: any) {
            alert(err.response?.data?.error || "Payment verification failed");
        } finally {
            setVerifyingPayment(false);
        }
    };

    const handleMarkReceived = async (returnId: number) => {
        const condition = prompt("Enter Condition Assessment (e.g. Good, Damaged):", "Good");
        if (!condition) return;
        try {
            await api.post("/returns/received", { returnId, conditionAssessment: condition });
            alert("Return marked as Received");
            fetchOrder();
        } catch (err: any) {
            alert(err.response?.data?.error || "Failed");
        }
    };

    const handleRefund = async (_returnId: number, type: 'PAYTM' | 'COD') => {
        if (!window.confirm(`Initiate ${type} refund?`)) return;
        try {
            if (type === 'PAYTM') {
                await api.post("/refunds/initiate", { orderId: order.id });
            } else {
                // For COD, we normally ask for bank details, but here we'll assume manual transfer done or just initiate record
                // The controller expects bankDetails.
                const accNo = prompt("Enter Customer Account No:");
                const ifsc = prompt("Enter IFSC:");
                if (!accNo || !ifsc) return;

                await api.post("/refunds/cod-initiate", {
                    orderId: order.id,
                    bankDetails: { account_number: accNo, ifsc: ifsc }
                });
            }
            alert("Refund Initiated Successfully");
            fetchOrder();
        } catch (err: any) {
            alert(err.response?.data?.error || "Refund Failed");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Order...</div>;
    if (!order) return <div className="p-8 text-center text-red-600">Order not found</div>;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PAID': return 'bg-green-100 text-green-800';
            case 'PENDING': return 'bg-yellow-100 text-yellow-800';
            case 'FAILED': return 'bg-red-100 text-red-800';
            case 'COMPLETED': return 'bg-green-100 text-green-800';
            case 'REFUNDED': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Package className="w-6 h-6" /> Order #{order.orderNumber}
                </h1>
                <button onClick={() => navigate("/admin/orders")} className="text-gray-600 hover:text-black">
                    &larr; Back to Orders
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT COLUMN - ORDER INFO */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Items */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-lg font-semibold mb-4 border-b pb-2">Items</h2>
                        <div className="space-y-4">
                            {order.items.map((item: any) => (
                                <div key={item.id} className="flex justify-between items-center">
                                    <div className="flex gap-4">
                                        <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center">
                                            {/* Ideally Product Image */}
                                            <Box size={24} className="text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{item.variant.product.title}</p>
                                            <p className="text-sm text-gray-500">Qty: {item.quantity} | SKU: {item.variant.sku}</p>
                                            <p className="text-sm text-gray-500">Size: {item.variant.size} | Color: {item.variant.color}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium">₹{item.price}</p>
                                        <p className="text-xs text-gray-500">Total: ₹{item.price * item.quantity}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t flex justify-between items-center">
                            <span className="font-medium text-gray-600">Total Amount</span>
                            <span className="text-xl font-bold">₹{order.totalAmount}</span>
                        </div>
                    </div>

                    {/* Customer & Address */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-lg font-semibold mb-4 border-b pb-2">Customer & Shipping</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold mb-2">Customer</p>
                                <p className="font-medium">{order.user.name}</p>
                                <p className="text-gray-600">{order.user.email}</p>
                                <p className="text-gray-600">{order.user.phone}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold mb-2">Shipping Address</p>
                                <div className="text-gray-700">
                                    <p>{order.shippingAddress.fullName}</p>
                                    <p>{order.shippingAddress.address}</p>
                                    <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                                    <p className="text-sm mt-1 flex items-center gap-1"><MapPin size={14} /> India</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Logistics Panel */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Truck className="w-5 h-5" /> Logistics Control
                            </h2>
                            {order.shipments && order.shipments.length > 0 && (
                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                                    Shipped
                                </span>
                            )}
                        </div>

                        {order.shipments && order.shipments.length > 0 ? (
                            <div className="space-y-4">
                                {order.shipments.map((shipment: any) => (
                                    <div key={shipment.id} className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                        <div className="flex justify-between mb-2">
                                            <span className="font-semibold text-blue-900">{shipment.courier_provider}</span>
                                            <span className="text-sm font-medium">{shipment.status}</span>
                                        </div>
                                        <div className="text-sm text-blue-800 mb-2">
                                            AWB: <span className="font-mono">{shipment.waybill || 'N/A'}</span>
                                        </div>
                                        <div className="flex gap-2 mt-3">
                                            <a href={shipment.label_url || '#'} target="_blank" rel="noreferrer"
                                                className={`flex items-center gap-1 text-xs px-3 py-1.5 bg-white border border-blue-200 rounded hover:bg-gray-50 ${!shipment.label_url && 'opacity-50 cursor-not-allowed'}`}>
                                                <Printer size={14} /> Download Label
                                            </a>
                                            <button
                                                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-white border border-blue-200 rounded hover:bg-gray-50"
                                                onClick={() => window.open(`https://shiprocket.co/tracking/${shipment.waybill}`, '_blank')}
                                            >
                                                <ExternalLink size={14} /> Track
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="text-xs font-medium text-gray-500">Weight (kg) <span className="text-red-500">*</span></label>
                                        <input
                                            type="number" step="0.1"
                                            value={dims.weight}
                                            onChange={(e) => setDims({ ...dims, weight: parseFloat(e.target.value) })}
                                            className="w-full mt-1 p-2 border rounded-md text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-500">Dims (L x B x H) cm</label>
                                        <div className="flex gap-2 mt-1">
                                            <input type="number" placeholder="L" className="w-full p-2 border rounded-md text-sm" value={dims.length} onChange={(e) => setDims({ ...dims, length: parseInt(e.target.value) })} />
                                            <input type="number" placeholder="B" className="w-full p-2 border rounded-md text-sm" value={dims.breadth} onChange={(e) => setDims({ ...dims, breadth: parseInt(e.target.value) })} />
                                            <input type="number" placeholder="H" className="w-full p-2 border rounded-md text-sm" value={dims.height} onChange={(e) => setDims({ ...dims, height: parseInt(e.target.value) })} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={checkServiceability}
                                        disabled={checkingService}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                                    >
                                        {checkingService ? 'Checking...' : 'Check Pincode'}
                                    </button>
                                    <button
                                        onClick={createShipment}
                                        disabled={shippingLoading || (order.paymentMethod === 'PAYTM' && order.status !== 'PAID')}
                                        className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {shippingLoading ? 'Creating Order...' : 'Ship with Shiprocket'}
                                    </button>
                                </div>

                                {order.paymentMethod === 'PAYTM' && order.status !== 'PAID' && (
                                    <p className="text-xs text-red-500 mt-2">
                                        <AlertCircle size={12} className="inline mr-1" />
                                        Cannot ship unpaid Prepaid order. Verify payment first.
                                    </p>
                                )}

                                {serviceability && (
                                    <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
                                        <p className="font-semibold mb-2">Serviceability Result:</p>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            {serviceability.data?.available_courier_companies?.[0] ? (
                                                <>
                                                    <p>Courier: {serviceability.data.available_courier_companies[0].courier_name}</p>
                                                    <p>Rate: ₹{serviceability.data.available_courier_companies[0].rate}</p>
                                                    <p>ETD: {serviceability.data.available_courier_companies[0].etd}</p>
                                                </>
                                            ) : (
                                                <p className="text-red-600">No couriers available or check failed.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </div>

                {/* RIGHT COLUMN - ACTIONS & PAYMENT */}
                <div className="space-y-6">

                    {/* Payment Status */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
                            <CreditCard className="w-5 h-5" /> Payment
                        </h2>

                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-gray-500">Method</span>
                                <span className="font-medium">{order.paymentMethod}</span>
                            </div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-gray-500">Status</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.payment?.status || order.status)}`}>
                                    {order.payment?.status || order.status}
                                </span>
                            </div>
                        </div>

                        {order.payment && (
                            <div className="space-y-2 text-sm bg-gray-50 p-3 rounded">
                                {order.payment.paytm_txn_id && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Txn ID</span>
                                        <span className="font-mono text-xs">{order.payment.paytm_txn_id}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-6 flex flex-col gap-2">
                            <button
                                onClick={verifyPayment}
                                disabled={verifyingPayment}
                                className="w-full flex items-center justify-center gap-2 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700"
                            >
                                <RefreshCw className={`w-4 h-4 ${verifyingPayment ? 'animate-spin' : ''}`} />
                                Refresh Payment Status
                            </button>
                        </div>
                    </div>

                    {/* Return & Refund */}
                    {order.return && order.return.length > 0 && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h2 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
                                <RefreshCw className="w-5 h-5 text-orange-600" /> Restocking & Refund
                            </h2>
                            {order.return.map((ret: any) => (
                                <div key={ret.id} className="text-sm space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Status</span>
                                        <span className={`font-semibold ${getStatusColor(ret.status)}`}>{ret.status}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Reason</span>
                                        <span>{ret.reason}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Refund Amount</span>
                                        <span className="font-medium">₹{ret.approvedRefundAmount || ret.estimatedRefundAmount}</span>
                                    </div>

                                    {/* Actions based on Return Status */}
                                    <div className="pt-2 flex flex-col gap-2">
                                        {['APPROVED', 'PICKUP_SCHEDULED'].includes(ret.status) && (
                                            <button
                                                onClick={() => handleMarkReceived(ret.id)}
                                                className="w-full py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-100 font-medium"
                                            >
                                                Mark Received (Warehoused)
                                            </button>
                                        )}

                                        {ret.status === 'RETURNED' && order.payment?.status !== 'REFUNDED' && (
                                            <button
                                                onClick={() => handleRefund(ret.id, order.paymentMethod === 'COD' ? 'COD' : 'PAYTM')}
                                                className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                                            >
                                                Process {order.paymentMethod === 'COD' ? 'COD' : 'Paytm'} Refund
                                            </button>
                                        )}

                                        {order.payment?.status === 'REFUNDED' && (
                                            <div className="p-2 bg-green-50 text-green-700 text-center rounded border border-green-200">
                                                Refund Successfully Processed
                                            </div>
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
};

export default AdminOrderDetails;
