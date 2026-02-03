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
    // Filter State (Syncs with URL)
    const categoryId = searchParams.get('category') || '';
    const brandId = searchParams.get('brand') || '';
    const sort = searchParams.get('sort') || 'newest';
    const searchQuery = searchParams.get('q') || '';
    const colorFilter = searchParams.get('color') || '';
    const minPriceFilter = searchParams.get('minPrice') || '';
    const maxPriceFilter = searchParams.get('maxPrice') || '';

    const [availableFilters, setAvailableFilters] = useState<{ minPrice: number, maxPrice: number, colors: string[] }>({ minPrice: 0, maxPrice: 10000, colors: [] });

    useEffect(() => {
        // 1. Fetch Master Data & Filter Options
        const fetchMasterData = async () => {
            const [catRes, brandRes, filterRes] = await Promise.all([
                api.get('/master/categories'),
                api.get('/master/brands'),
                api.get('/products/filters')
            ]);
            setCategories(catRes.data);
            setBrands(brandRes.data);
            setAvailableFilters(filterRes.data);
        };
        fetchMasterData();
    }, []);

    // Header / Search Info
    const [page, setPage] = useState(1);
    const limit = 20;

    useEffect(() => {
        // 2. Fetch Products whenever filters change
        const fetchProducts = async () => {
            setLoading(true);
            try {
                // Build Query String
                const query = new URLSearchParams({
                    limit: String(limit),
                    page: String(page),
                    sort,
                    ...(categoryId && { category: categoryId }),
                    ...(brandId && { brand: brandId }),
                    ...(searchQuery && { search: searchQuery }),
                    ...(colorFilter && { color: colorFilter }),
                    ...(minPriceFilter && { minPrice: minPriceFilter }),
                    ...(maxPriceFilter && { maxPrice: maxPriceFilter }),
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
    }, [categoryId, brandId, sort, searchQuery, page, colorFilter, minPriceFilter, maxPriceFilter]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [categoryId, brandId, sort, searchQuery, colorFilter, minPriceFilter, maxPriceFilter]);

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
                    <div className="lg:hidden flex justify-between items-center mb-4">
                        <button
                            className="flex items-center gap-2 border p-2 rounded"
                            onClick={() => setShowMobileFilters(!showMobileFilters)}
                        >
                            <Filter size={20} /> Filters
                        </button>
                    </div>

                    {/* SIDEBAR FILTERS */}
                    <div className={`lg:w-64 space-y-8 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>

                        {/* Header with Clear All */}
                        <div className="flex justify-between items-center border-b pb-4">
                            <h2 className="font-bold text-lg">Filters</h2>
                            {(categoryId || brandId || searchQuery || colorFilter || minPriceFilter) && (
                                <button
                                    onClick={() => setSearchParams({})}
                                    className="text-xs text-red-600 font-bold hover:underline"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>

                        {/* 1. Categories (Hierarchical) */}
                        <div>
                            <h3 className="font-bold mb-4">Category</h3>
                            <div className="space-y-2">
                                {categories.map((cat: any) => (
                                    <div key={cat.id}>
                                        <label className="flex items-center gap-2 cursor-pointer group">
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

                                        {/* Show Subcategories if Parent is Selected OR if a Child is Selected */}
                                        {(categoryId === String(cat.id) || cat.children?.some((c: any) => String(c.id) === categoryId)) && cat.children?.length > 0 && (
                                            <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
                                                {cat.children.map((child: any) => (
                                                    <label key={child.id} className="flex items-center gap-2 cursor-pointer group">
                                                        <input
                                                            type="radio"
                                                            name="category" // Same group to allow switching
                                                            className="accent-black w-3 h-3"
                                                            checked={categoryId === String(child.id)}
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                updateFilter('category', String(child.id));
                                                            }}
                                                        />
                                                        <span className={`text-sm ${categoryId === String(child.id) ? 'font-bold text-black' : 'text-gray-500 group-hover:text-black'}`}>
                                                            {child.name}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. Price Range */}
                        <div>
                            <h3 className="font-bold mb-4">Price Range</h3>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    placeholder="Min"
                                    className="w-full border p-2 rounded text-sm"
                                    value={minPriceFilter}
                                    onChange={(e) => updateFilter('minPrice', e.target.value)}
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="number"
                                    placeholder="Max"
                                    className="w-full border p-2 rounded text-sm"
                                    value={maxPriceFilter}
                                    onChange={(e) => updateFilter('maxPrice', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* 3. Colors */}
                        <div>
                            <h3 className="font-bold mb-4">Colors</h3>
                            <div className="flex flex-wrap gap-2">
                                {availableFilters.colors.map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => updateFilter('color', colorFilter === c ? '' : c)}
                                        className={`w-8 h-8 rounded-full border shadow-sm transition-transform hover:scale-110 relative ${colorFilter === c ? 'ring-2 ring-black ring-offset-2' : ''
                                            }`}
                                        style={{ backgroundColor: c.toLowerCase() }}
                                        title={c}
                                    >
                                        {/* Checkmark for white/light colors or selected state */}
                                        {colorFilter === c && <span className="absolute inset-0 flex items-center justify-center mix-blend-difference text-white text-xs">✓</span>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 4. Brands */}
                        <div>
                            <h3 className="font-bold mb-4">Brand</h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
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

                        {/* 5. Sort */}
                        <div>
                            <h3 className="font-bold mb-4">Sort By</h3>
                            <select
                                className="w-full border p-2 rounded"
                                value={sort}
                                onChange={(e) => updateFilter('sort', e.target.value)}
                            >
                                <option value="newest">Newest Arrivals</option>
                                <option value="best_selling">Best Sellers</option>
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
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
                                    {products.map((p: any) => (
                                        <ProductCard key={p.id} product={p} />
                                    ))}
                                </div>

                                {/* Pagination Controls */}
                                <div className="mt-12 flex justify-center gap-4">
                                    <button
                                        disabled={page === 1}
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-black hover:text-white transition-colors"
                                    >
                                        Previous
                                    </button>
                                    <span className="px-4 py-2 font-bold">Page {page}</span>
                                    <button
                                        disabled={products.length < limit} // Simple logic: if fewer items than limit, it's last page
                                        onClick={() => setPage(p => p + 1)}
                                        className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-black hover:text-white transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Shop;