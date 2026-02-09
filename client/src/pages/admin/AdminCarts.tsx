import { useEffect, useState } from "react";
import api from "../../api/axios";
import { ShoppingCart } from "lucide-react";
import Pagination from "../../components/Pagination";

const AdminCarts = () => {
    const [carts, setCarts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [limit] = useState(10);

    useEffect(() => {
        fetchCarts(page);
    }, [page]);

    const fetchCarts = async (currentPage: number) => {
        try {
            const res = await api.get(`/admin/carts?page=${currentPage}&limit=${limit}`);
            setCarts(res.data.data);
            setTotalPages(res.data.meta.pages);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading Carts...</div>;

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Active Carts</h1>

            <div className="grid gap-6">
                {carts.length === 0 ? (
                    <p>No active carts found.</p>
                ) : carts.map((cart: any) => (
                    <div key={cart.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-purple-50 text-purple-600 p-2 rounded-full">
                                    <ShoppingCart size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{cart.user?.name || "Guest/Use"}</h3>
                                    <p className="text-sm text-gray-500">Phone: {cart.user?.phone || "-"}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold">₹{cart.estimatedValue}</p>
                                <p className="text-xs text-gray-500">{cart.totalItems} Items</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Cart Contents</h4>
                            <ul className="space-y-2">
                                {cart.items.map((item: any) => (
                                    <li key={item.id} className="flex justify-between text-sm">
                                        <span className="text-gray-700">{item.variant.product.title}</span>
                                        <span className="text-gray-500 font-medium">x{item.quantity}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>

            {carts.length > 0 && <div className="mt-8">
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>}
        </div>
    );
};

export default AdminCarts;
