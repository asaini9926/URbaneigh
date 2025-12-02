import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash, ArrowLeft, Upload, X } from 'lucide-react';

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [variants, setVariants] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
        const [catRes, brandRes, prodRes] = await Promise.all([
            api.get('/master/categories'),
            api.get('/master/brands'),
            api.get(`/products/${id}`)
        ]);
        setCategories(catRes.data);
        setBrands(brandRes.data);
        
        // Pre-fill Form
        const p = prodRes.data;
        setTitle(p.title);
        setDescription(p.description);
        setCategoryId(p.categoryId);
        setBrandId(p.brandId);
        
        // Map variants to our form structure
        const mappedVariants = p.variants.map((v: any) => ({
            id: v.id, // Keep ID to update existing
            sku: v.sku,
            color: v.color,
            size: v.size,
            price: v.price,
            stock: v.inventory?.quantity || 0,
            images: v.images.map((img: any) => img.url) // Flatten images
        }));
        setVariants(mappedVariants);

    } catch (err) {
        console.error(err);
        alert("Failed to load product data");
        navigate('/admin/products');
    } finally {
        setLoading(false);
    }
  };

  const handleVariantChange = (index: number, field: string, value: any) => {
    const newVariants = [...variants];
    newVariants[index][field] = value;
    setVariants(newVariants);
  };

  const handleAddVariant = () => {
    setVariants([...variants, { sku: '', color: '', size: '', price: '', stock: '', images: [] }]);
  };

  const handleRemoveVariant = (index: number) => {
     // Note: In a real app, you might want to mark for deletion instead of removing from array immediately
     // if you want to track deleted IDs. For now, we just remove from UI list.
    const newVariants = [...variants];
    newVariants.splice(index, 1);
    setVariants(newVariants);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const payload = {
            title,
            description,
            categoryId: Number(categoryId),
            brandId: Number(brandId),
            variants: variants.map(v => ({
                id: v.id, // Include ID if it exists
                sku: v.sku,
                color: v.color,
                size: v.size,
                price: Number(v.price),
                stock: Number(v.stock),
                images: v.images.map((url: string) => ({ url }))
            }))
        };

        await api.put(`/products/${id}`, payload);
        alert('Product Updated Successfully!');
        navigate('/admin/products');
    } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to update');
    }
  };

  if(loading) return <div>Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-black mb-6">
        <ArrowLeft size={20} className="mr-2"/> Back to Products
      </button>
      
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Edit Product</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
            <h2 className="text-lg font-bold border-b pb-2">Basic Details</h2>
            <div>
                <label className="block text-sm font-medium mb-1">Product Title</label>
                <input required className="w-full border p-2 rounded" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea required rows={3} className="w-full border p-2 rounded" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select required className="w-full border p-2 rounded" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                        <option value="">Select Category</option>
                        {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Brand</label>
                    <select required className="w-full border p-2 rounded" value={brandId} onChange={e => setBrandId(e.target.value)}>
                        <option value="">Select Brand</option>
                        {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>
            </div>
        </div>

        {/* Variants Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
                <h2 className="text-lg font-bold">Variants</h2>
                <button type="button" onClick={handleAddVariant} className="text-sm bg-black text-white px-3 py-1 rounded flex items-center gap-1">
                    <Plus size={16} /> Add Variant
                </button>
            </div>

            {variants.map((variant, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end border bg-gray-50 p-4 rounded">
                     <div>
                        <label className="text-xs font-bold text-gray-500">Color</label>
                        <input required className="w-full border p-2 rounded text-sm" 
                            value={variant.color} onChange={e => handleVariantChange(index, 'color', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">Size</label>
                        <input required className="w-full border p-2 rounded text-sm" 
                            value={variant.size} onChange={e => handleVariantChange(index, 'size', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">Price</label>
                        <input required type="number" className="w-full border p-2 rounded text-sm" 
                            value={variant.price} onChange={e => handleVariantChange(index, 'price', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">Stock</label>
                        <input required type="number" className="w-full border p-2 rounded text-sm" 
                            value={variant.stock} onChange={e => handleVariantChange(index, 'stock', e.target.value)} />
                    </div>
                    <div>
                        <button type="button" onClick={() => handleRemoveVariant(index)} className="text-red-500 p-2 hover:bg-red-100 rounded">
                            <Trash size={18} /> Remove
                        </button>
                    </div>
                </div>
            ))}
        </div>

        <button type="submit" className="w-full bg-black text-white py-4 rounded-lg font-bold text-lg hover:bg-gray-800">
            Save Changes
        </button>
      </form>
    </div>
  );
};

export default EditProduct;