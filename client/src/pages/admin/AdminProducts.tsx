import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { Plus, Edit, Trash2, Download, Upload, AlertTriangle } from "lucide-react";
import Pagination from "../../components/Pagination";

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10); // Fixed limit for now

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts(page);
  }, [page, activeTab]); // Refetch on page or tab change

  const fetchProducts = async (currentPage: number) => {
    setLoading(true);
    try {
      // Pass status if not 'all'
      const statusParam = activeTab === 'all' ? '' : `&status=${activeTab.toUpperCase()}`;
      const res = await api.get(`/products?page=${currentPage}&limit=${limit}${statusParam}`);

      setProducts(res.data.data);
      setTotalPages(res.data.meta.pages);
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
      fetchProducts(page);
      alert("Product Deleted");
    } catch (err: any) {
      alert(err.response?.data?.error || "Delete failed");
    }
  };

  // --- Export Handler ---
  const handleExport = async () => {
    try {
      const res = await api.get('/products/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Export Failed", err);
      alert("Failed to export products.");
    }
  };

  // --- Import Handler ---
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      // alert("Import started... please wait.");
      const res = await api.post('/products/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(res.data.message);
      fetchProducts(page); // Refresh
    } catch (err: any) {
      console.error("Import Failed", err);
      alert(err.response?.data?.error || "Failed to import products");
    } finally {
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <div className="flex gap-3">

          {/* FILE INPUT HIDDEN */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />

          <button
            onClick={handleExport}
            className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
          >
            <Download size={16} /> Export
          </button>

          <button
            onClick={handleImportClick}
            className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
          >
            <Upload size={16} /> Import
          </button>

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
                onClick={() => { setActiveTab(tab); setPage(1); }} // Reset page on tab change
                className={`py-3 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Filters Bar (Visual Only) */}
        <div className="p-3 border-b border-gray-100 flex gap-2 items-center bg-gray-50/50">
          {/* Filters UI kept same */}
          <div className="relative flex-1 max-w-md">
            <input type="text" placeholder="Filter products..." className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded shadow-sm focus:border-black focus:ring-1 focus:ring-black" />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading Products...</div>
        ) : (
          <>
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                <tr>
                  <th className="p-4 w-10"><input type="checkbox" className="rounded border-gray-300" /></th>
                  <th className="p-4 w-16"></th>
                  <th className="p-4">Product</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Variants</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p: any) => {
                  const mainImage = p.variants[0]?.images[0]?.url || 'https://via.placeholder.com/40';

                  return (
                    <tr key={p.id} className="hover:bg-gray-50 group transition-colors">
                      <td className="p-4"><input type="checkbox" className="rounded border-gray-300" /></td>
                      <td className="p-4">
                        <div className="w-10 h-10 rounded border border-gray-200 overflow-hidden bg-gray-100">
                          <img src={mainImage} className="w-full h-full object-cover" alt="" />
                        </div>
                      </td>
                      <td className="p-4">
                        <Link to={`/admin/products/edit/${p.id}`} className="font-semibold text-gray-900 hover:underline block">{p.title}</Link>
                        <span className="text-xs text-gray-500">{p.category?.name} • {p.brand?.name}</span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {p.status === 'ACTIVE' ? 'Active' : 'Draft'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={p.totalStock === 0 ? 'text-red-600 font-bold' : 'text-gray-900 font-medium'}>
                            {p.totalStock}
                          </span>
                          {p.lowStockVariants > 0 && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded flex items-center gap-1" title={`${p.lowStockVariants} variants low on stock`}>
                              <AlertTriangle size={10} /> {p.lowStockVariants} Low
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {p.variantCount}
                      </td>

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
            <div className="p-4 border-t border-gray-100">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}

        {products.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            No products found in this view.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProducts;
