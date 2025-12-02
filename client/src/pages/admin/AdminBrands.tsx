import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Plus, Trash2, Tag, X } from 'lucide-react';

const AdminBrands = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newBrand, setNewBrand] = useState({ name: '', slug: '' });

  useEffect(() => { fetchBrands(); }, []);

  const fetchBrands = async () => {
    try {
      const res = await api.get('/master/brands');
      setBrands(res.data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await api.post('/master/brands', newBrand);
        alert("Brand Created!");
        setNewBrand({ name: '', slug: '' });
        setShowForm(false);
        fetchBrands();
    } catch (err: any) { alert("Failed to create brand"); }
  };

  const handleDelete = async (id: number) => {
    if(!window.confirm("Delete this brand?")) return;
    try {
        await api.delete(`/master/brands/${id}`);
        fetchBrands();
    } catch (err: any) { alert(err.response?.data?.error || "Delete failed"); }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Brands</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-black text-white px-4 py-2 rounded flex items-center gap-2">
            {showForm ? <X size={20}/> : <Plus size={20}/>} {showForm ? 'Close' : 'Add Brand'}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-100 p-6 rounded-lg mb-8 border border-gray-200">
            <h3 className="font-bold mb-4">Add New Brand</h3>
            <form onSubmit={handleCreate} className="flex gap-4 items-end">
                <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500">Brand Name</label>
                    <input required className="w-full p-2 rounded border" value={newBrand.name} 
                        onChange={e => setNewBrand({ 
                            name: e.target.value, 
                            slug: e.target.value.toLowerCase().replace(/ /g, '-') 
                        })} />
                </div>
                <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500">Slug</label>
                    <input required className="w-full p-2 rounded border bg-gray-50" value={newBrand.slug} readOnly />
                </div>
                <button type="submit" className="bg-green-600 text-white font-bold py-2 px-6 rounded">Create</button>
            </form>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {brands.map((brand: any) => (
            <div key={brand.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-2 font-medium">
                    <Tag size={16} className="text-gray-400" /> {brand.name}
                </div>
                <button onClick={() => handleDelete(brand.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={16} />
                </button>
            </div>
        ))}
      </div>
    </div>
  );
};

export default AdminBrands;