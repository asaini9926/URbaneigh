import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { Plus, Edit, Trash2 } from "lucide-react";

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get("/products?limit=100"); // Get all
      setProducts(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (
      !window.confirm("Are you sure? This will permanently delete the product.")
    )
      return;

    try {
      await api.delete(`/products/${id}`);
      fetchProducts(); // Refresh list
      alert("Product Deleted");
    } catch (err: any) {
      alert(
        err.response?.data?.error || "Delete failed (Item might be in an order)"
      );
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <Link
          to="/admin/products/new"
          className="bg-black text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-gray-800"
        >
          <Plus size={20} /> Add Product
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-900 font-bold border-b">
            <tr>
              <th className="p-4">Product</th>
              <th className="p-4">Category</th>
              <th className="p-4">Brand</th>
              <th className="p-4">Variants</th>
              <th className="p-4">Price</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="p-4 font-medium text-black">{p.title}</td>
                <td className="p-4">{p.category?.name}</td>
                <td className="p-4">{p.brand?.name}</td>
                <td className="p-4">
                  {p.variants.length} options
                  <div className="text-xs text-gray-400 mt-1">
                    {p.variants
                      .map((v: any) => `${v.color}-${v.size}`)
                      .join(", ")}
                  </div>
                </td>
                <td className="p-4 font-bold">₹{p.variants[0]?.price}</td>
                <td className="p-4 flex gap-2">
                  <Link
                    to={`/admin/products/edit/${p.id}`}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit size={16} />
                  </Link>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>{" "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminProducts;
