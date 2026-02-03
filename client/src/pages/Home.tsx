import { useEffect, useState } from 'react';
import Hero from '../components/Hero';
import ProductSlider from '../components/ProductSlider';
import VideoShowcase from '../components/VideoShowcase'; // New
import api from '../api/axios';
import { ArrowRight, Star, Truck, ShieldCheck, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
  const [newArrivals, setNewArrivals] = useState<any[]>([]);
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]); // New
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch Data
    const fetchData = async () => {
      try {
        const [newRes, bestRes, vidRes] = await Promise.allSettled([
          api.get('/products?limit=10&sort=newest'),
          api.get('/products?limit=10&sort=best_selling'),
          api.get('/marketing/videos')
        ]);

        // Handle Promise.allSettled
        if (newRes.status === 'fulfilled' && newRes.value?.data?.data) {
          setNewArrivals(newRes.value.data.data);
        }
        if (bestRes.status === 'fulfilled' && bestRes.value?.data?.data) {
          setBestSellers(bestRes.value.data.data);
        }
        if (vidRes.status === 'fulfilled' && Array.isArray(vidRes.value?.data)) {
          setVideos(vidRes.value.data);
        }

      } catch (err) {
        console.error("Failed to fetch products", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const categories = [
    { id: 'men', name: 'Men', image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=1974&auto=format&fit=crop', link: '/shop?category=men' },
    { id: 'women', name: 'Women', image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1974&auto=format&fit=crop', link: '/shop?category=women' },
    { id: 'best', name: 'Best Sellers', image: 'https://images.pexels.com/photos/5264895/pexels-photo-5264895.jpeg', link: '/shop?sort=best_selling' },
  ];

  return (
    <div>
      <Hero />

      {/* 1. Category Tiles */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16'>
        <h2 className="text-2xl font-bold mb-8">Shop by Category</h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {categories.map((cat) => (
            <Link to={cat.link} key={cat.id} className='group relative h-96 overflow-hidden rounded-lg'>
              <img
                src={cat.image}
                alt={cat.name}
                className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-105'
              />
              <div className='absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors' />
              <div className='absolute bottom-6 left-6 text-white'>
                <h3 className='text-3xl font-bold mb-2'>{cat.name}</h3>
                <span className='inline-flex items-center text-sm font-bold uppercase tracking-wider border-b-2 border-white pb-1'>
                  Explore <ArrowRight size={16} className='ml-2' />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 2. New Arrivals Slider */}
      <ProductSlider
        title="New Arrivals"
        subtitle="Fresh looks just for you."
        products={newArrivals}
        link="/shop?sort=newest"
      />

      {/* 3. Promotional Banner */}
      <div className='bg-black text-white py-16'>
        <div className='max-w-7xl mx-auto px-4 text-center'>
          <span className='text-sm font-bold uppercase tracking-widest text-gray-400 mb-2 block'>Limited Offer</span>
          <h2 className='text-3xl md:text-5xl font-bold mb-6'>Get 20% Off Your First Order</h2>
          <p className='text-gray-300 max-w-2xl mx-auto mb-8'>
            Join the Urbaneigh family and experience premium comfort. Use code <span className='text-white font-bold bg-gray-800 px-2 py-1 rounded'>WELCOME20</span> at checkout.
          </p>
          <Link to="/shop" className='inline-block bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors'>
            Shop Now
          </Link>
        </div>
      </div>

      {/* 4. Best Sellers Slider */}
      <ProductSlider
        title="Trending Now"
        subtitle="Our most loved styles."
        products={bestSellers}
        link="/shop?sort=best_selling"
      />

      {/* 5. SHOPPABLE VIDEOS */}
      <VideoShowcase videos={videos} />

      {/* 6. Features / Trust Signals */}
      <div className='py-16 border-t border-gray-100'>
        <div className='max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center'>
          <div className='flex flex-col items-center'>
            <div className='bg-gray-50 p-4 rounded-full mb-4'>
              <Truck size={32} />
            </div>
            <h3 className='font-bold text-lg mb-2'>Free Shipping</h3>
            <p className='text-gray-500 text-sm'>On all orders above ₹999</p>
          </div>
          <div className='flex flex-col items-center'>
            <div className='bg-gray-50 p-4 rounded-full mb-4'>
              <RefreshCw size={32} />
            </div>
            <h3 className='font-bold text-lg mb-2'>Easy Returns</h3>
            <p className='text-gray-500 text-sm'>7-day return policy</p>
          </div>
          <div className='flex flex-col items-center'>
            <div className='bg-gray-50 p-4 rounded-full mb-4'>
              <ShieldCheck size={32} />
            </div>
            <h3 className='font-bold text-lg mb-2'>Secure Payment</h3>
            <p className='text-gray-500 text-sm'>100% secure checkout</p>
          </div>
        </div>
      </div>

      {/* 7. Testimonials */}
      <div className='bg-gray-50 py-20'>
        <div className='max-w-7xl mx-auto px-4'>
          <h2 className='text-3xl font-bold text-center mb-12'>What Our Customers Say</h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            {[1, 2, 3].map((i) => (
              <div key={i} className='bg-white p-8 rounded-lg shadow-sm'>
                <div className='flex gap-1 text-yellow-400 mb-4'>
                  {[...Array(5)].map((_, idx) => <Star key={idx} size={16} fill="currentColor" />)}
                </div>
                <p className='text-gray-600 mb-6 italic'>"Absolutely love the fabric quality. It feels so premium and the fit is just perfect. Will definitely buy more!"</p>
                <div className='flex items-center gap-4'>
                  <div className='w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold'>
                    {String.fromCharCode(64 + i)}
                  </div>
                  <div>
                    <p className='font-bold text-sm'>Verified Customer</p>
                    <p className='text-xs text-gray-500'>Mumbai, India</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Home;