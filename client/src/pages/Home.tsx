import { useEffect, useState } from 'react';
import Hero from '../components/Hero';
import ProductCard from '../components/ProductCard';
import api from '../api/axios';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch products from YOUR backend
    const fetchProducts = async () => {
      try {
        const res = await api.get('/products?limit=4'); // Get top 4 products
        setProducts(res.data.data); // accessing { data: [...], meta: ... }
      } catch (err) {
        console.error("Failed to fetch products", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div>
      <Hero />
      
      {/* Featured Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">New Arrivals</h2>
            <p className="text-gray-500">
                Explore our latest collection of comfort wear, designed to make you feel at home wherever you go.
            </p>
        </div>

        {/* Product Grid */}
        {loading ? (
            <div className="text-center py-20 text-gray-400">Loading your collection...</div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
                {products.length > 0 ? (
                    products.map((product: any) => (
                        <ProductCard key={product.id} product={product} />
                    ))
                ) : (
                    <div className="col-span-4 text-center py-10 bg-gray-50 rounded-lg">
                        <p className="text-gray-500">No products found yet. (Go to Admin to add some!)</p>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default Home;