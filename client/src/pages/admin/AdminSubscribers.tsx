import { useEffect, useState } from "react";
import api from "../../api/axios";
import { Mail } from "lucide-react";

const AdminSubscribers = () => {
    const [subscribers, setSubscribers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSubscribers();
    }, []);

    const fetchSubscribers = async () => {
        try {
            const res = await api.get("/subscribers"); // Admin route in index.js
            setSubscribers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Newsletter Subscribers</h1>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b font-bold text-gray-900">
                        <tr>
                            <th className="p-4">Email</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Joined At</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {subscribers.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="p-8 text-center text-gray-500">No subscribers yet.</td>
                            </tr>
                        ) : (
                            subscribers.map((sub: any) => (
                                <tr key={sub.id} className="hover:bg-gray-50">
                                    <td className="p-4 flex items-center gap-3">
                                        <div className="bg-gray-100 p-2 rounded-full text-gray-500">
                                            <Mail size={16} />
                                        </div>
                                        {sub.email}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${sub.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {sub.isActive ? 'Active' : 'Unsubscribed'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-500">
                                        {new Date(sub.createdAt).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminSubscribers;
