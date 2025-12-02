import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import ProductCard from '../components/ProductCard';
import { Filter, X } from 'lucide-react';

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Data State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Filter State (Syncs with URL)
  const categoryId = searchParams.get('category') || '';
  const brandId = searchParams.get('brand') || '';
  const sort = searchParams.get('sort') || 'newest';
  const searchQuery = searchParams.get('q') || '';

  useEffect(() => {
    // 1. Fetch Master Data for Sidebar
    const fetchMasterData = async () => {
        const [catRes, brandRes] = await Promise.all([
            api.get('/master/categories'),
            api.get('/master/brands')
        ]);
        setCategories(catRes.data);
        setBrands(brandRes.data);
    };
    fetchMasterData();
  }, []);

  useEffect(() => {
    // 2. Fetch Products whenever filters change
    const fetchProducts = async () => {
        setLoading(true);
        try {
            // Build Query String
            const query = new URLSearchParams({
                limit: '50',
                sort,
                ...(categoryId && { category: categoryId }),
                ...(brandId && { brand: brandId }),
                ...(searchQuery && { search: searchQuery })
            }).toString();

            const res = await api.get(`/products?${query}`);
            setProducts(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    fetchProducts();
  }, [categoryId, brandId, sort, searchQuery]);

  // Helper to update URL
  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
        newParams.set(key, value);
    } else {
        newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  return (
    <div className="bg-white min-h-screen">
      
      {/* Header / Search Info */}
      <div className="bg-gray-50 py-8 border-b">
        <div className="max-w-7xl mx-auto px-4">
            <h1 className="text-3xl font-bold text-gray-900">Shop Collection</h1>
            {searchQuery && <p className="text-gray-500 mt-2">Showing results for "{searchQuery}"</p>}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-12">
            
            {/* MOBILE FILTER TOGGLE */}
            <button 
                className="lg:hidden flex items-center gap-2 border p-2 rounded"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
            >
                <Filter size={20} /> Filters
            </button>

            {/* SIDEBAR FILTERS */}
            <div className={`lg:w-64 space-y-8 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
                
                {/* 1. Categories */}
                <div>
                    <h3 className="font-bold mb-4 flex justify-between">
                        Category 
                        {categoryId && <button onClick={() => updateFilter('category', '')} className="text-xs text-red-500">Clear</button>}
                    </h3>
                    <div className="space-y-2">
                        {categories.map((cat: any) => (
                            <label key={cat.id} className="flex items-center gap-2 cursor-pointer group">
                                <input 
                                    type="radio" 
                                    name="category"
                                    className="accent-black"
                                    checked={categoryId === String(cat.id)}
                                    onChange={() => updateFilter('category', String(cat.id))}
                                />
                                <span className={`${categoryId === String(cat.id) ? 'font-bold' : 'text-gray-600 group-hover:text-black'}`}>
                                    {cat.name}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* 2. Brands */}
                <div>
                    <h3 className="font-bold mb-4 flex justify-between">
                        Brand
                        {brandId && <button onClick={() => updateFilter('brand', '')} className="text-xs text-red-500">Clear</button>}
                    </h3>
                    <div className="space-y-2">
                        {brands.map((b: any) => (
                            <label key={b.id} className="flex items-center gap-2 cursor-pointer group">
                                <input 
                                    type="radio" 
                                    name="brand"
                                    className="accent-black"
                                    checked={brandId === String(b.id)}
                                    onChange={() => updateFilter('brand', String(b.id))}
                                />
                                <span className={`${brandId === String(b.id) ? 'font-bold' : 'text-gray-600 group-hover:text-black'}`}>
                                    {b.name}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* 3. Sort */}
                <div>
                    <h3 className="font-bold mb-4">Sort By</h3>
                    <select 
                        className="w-full border p-2 rounded" 
                        value={sort}
                        onChange={(e) => updateFilter('sort', e.target.value)}
                    >
                        <option value="newest">Newest Arrivals</option>
                        <option value="price_low">Price: Low to High</option>
                        <option value="price_high">Price: High to Low</option>
                    </select>
                </div>
            </div>

            {/* PRODUCT GRID */}
            <div className="flex-1">
                {loading ? (
                    <div className="text-center py-20 text-gray-400">Loading products...</div>
                ) : products.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded">
                        <p className="text-gray-500">No products match your filters.</p>
                        <button onClick={() => setSearchParams({})} className="text-black underline mt-2">Clear all filters</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
                        {products.map((p: any) => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>
                )}
            </div>

        </div>
      </div>
    </div>
  );
};

export default Shop;