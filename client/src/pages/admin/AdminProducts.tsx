import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { Plus, Edit, Trash2 } from "lucide-react";

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

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
    if (!window.confirm("Are you sure? This will permanently delete the product.")) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
      alert("Product Deleted");
    } catch (err: any) {
      alert(err.response?.data?.error || "Delete failed");
    }
  };

  const getInventoryTotal = (variants: any[]) => {
    return variants.reduce((acc, v) => acc + (v.inventory?.quantity || 0), 0);
  };

  const filteredProducts = activeTab === 'all'
    ? products
    : products.filter((p: any) => activeTab === 'active' ? p.status === 'ACTIVE' : p.status !== 'ACTIVE');

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <div className="flex gap-3">
          <button className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-50">Export</button>
          <button className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-50">Import</button>
          <Link
            to="/admin/products/new"
            className="bg-black text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-gray-800 text-sm font-medium"
          >
            <Plus size={16} /> Add product
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200 bg-white px-4">
          <div className="flex gap-6">
            {['all', 'active', 'draft', 'archived'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Filters Bar (Visual Only) */}
        <div className="p-3 border-b border-gray-100 flex gap-2 items-center bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <input type="text" placeholder="Filter products..." className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded shadow-sm focus:border-black focus:ring-1 focus:ring-black" />
          </div>
          <button className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white text-gray-600 shadow-sm hover:bg-gray-50">Vendor</button>
          <button className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white text-gray-600 shadow-sm hover:bg-gray-50">Tagged with</button>
          <button className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white text-gray-600 shadow-sm hover:bg-gray-50">Status</button>
        </div>

        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
            <tr>
              <th className="p-4 w-10"><input type="checkbox" className="rounded border-gray-300" /></th>
              <th className="p-4 w-16"></th>
              <th className="p-4">Product</th>
              <th className="p-4">Status</th>
              <th className="p-4">Inventory</th>
              <th className="p-4">Category</th>
              <th className="p-4">Brand</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredProducts.map((p: any) => {
              const inventory = getInventoryTotal(p.variants);
              const mainImage = p.variants[0]?.images[0]?.url || 'https://via.placeholder.com/40';

              return (
                <tr key={p.id} className="hover:bg-gray-50 group transition-colors">
                  <td className="p-4"><input type="checkbox" className="rounded border-gray-300" /></td>
                  <td className="p-4">
                    <div className="w-10 h-10 rounded border border-gray-200 overflow-hidden bg-gray-100">
                      <img src={mainImage} className="w-full h-full object-cover" alt="" />
                    </div>
                  </td>
                  <td className="p-4 font-semibold text-gray-900">
                    <Link to={`/admin/products/edit/${p.id}`} className="hover:underline">{p.title}</Link>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {p.status === 'ACTIVE' ? 'Active' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={inventory === 0 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                      {inventory} in stock
                    </span>
                    <div className="text-xs text-gray-400">{p.variants.length} variants</div>
                  </td>
                  <td className="p-4">{p.category?.name}</td>
                  <td className="p-4">{p.brand?.name}</td>
                  <td className="p-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex justify-end gap-2">
                      <Link to={`/admin/products/edit/${p.id}`} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded">
                        <Edit size={16} />
                      </Link>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No products found in this view.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProducts;
