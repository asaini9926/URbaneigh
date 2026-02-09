import { useEffect, useState } from "react";
import api from "../../api/axios";
import { User, Trash2, ShoppingBag, ShoppingCart } from "lucide-react";
import Pagination from "../../components/Pagination";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  useEffect(() => {
    fetchData(page);
  }, [page]);

  const fetchData = async (currentPage: number) => {
    try {
      // Fetching Filtered Customers ONLY
      const res = await api.get(`/admin/customers?page=${currentPage}&limit=${limit}`);
      setUsers(res.data.data);
      setTotalPages(res.data.meta.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm("Are you sure? This will delete the user permanently."))
      return;
    try {
      await api.delete(`/admin/users/${id}`);
      fetchData(page); // Refresh list
    } catch (err) {
      alert("Delete failed");
    }
  };

  if (loading) return <div>Loading Customers...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Customers
        </h1>
        {/* Removed "Add Employee" button as duplicates are managed via OTP login mainly now */}
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-900 font-bold border-b">
            <tr>
              <th className="p-4">Customer</th>
              <th className="p-4">Contact</th>
              <th className="p-4 text-center">Orders</th>
              <th className="p-4 text-center">Cart Items</th>
              <th className="p-4 text-center">Role</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">No customers found.</td>
              </tr>
            ) : users.map((user: any) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-100 p-2 rounded-full">
                      <User size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{user.name || "Unknown"}</p>
                      <p className="text-xs text-gray-500">ID: {user.id}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <p>{user.email || "-"}</p>
                  <p className="text-xs text-gray-500">{user.phone}</p>
                </td>

                {/* Orders Count */}
                <td className="p-4 text-center">
                  <div className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-bold">
                    <ShoppingBag size={12} /> {user.ordersCount}
                  </div>
                </td>

                {/* Cart Items Count */}
                <td className="p-4 text-center">
                  {user.cartItemsCount > 0 ? (
                    <div className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded-md text-xs font-bold">
                      <ShoppingCart size={12} /> {user.cartItemsCount}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>

                <td className="p-4 text-center">
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                    {user.role}
                  </span>
                </td>

                <td className="p-4 text-center">
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors"
                    title="Delete User"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length > 0 && <div className="p-4 border-t border-gray-100">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>}
      </div>
    </div>
  );
};

export default AdminUsers;
