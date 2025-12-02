import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../api/axios';

const Hero = () => {
  const [posters, setPosters] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fallback if no posters exist in DB
  const defaultPoster = {
      imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop',
      title: 'Comfort is the new Luxury.',
      subtitle: 'Discover our latest range of premium cotton essentials designed for your everyday life.'
  };

  useEffect(() => {
    const fetchPosters = async () => {
        try {
            // Note: Ensure your backend marketingController.getActivePoster returns an ARRAY []
            // If it returns a single object, we wrap it in an array.
            const res = await api.get('/marketing/poster/active'); 
            
            // Handle different possible response structures
            if (Array.isArray(res.data)) {
                setPosters(res.data);
            } else if (res.data && res.data.imageUrl) {
                // If backend returns single object, wrap it
                setPosters([res.data]);
            } else {
                setPosters([]);
            }
        } catch (err) {
            console.error("No posters found", err);
            setPosters([]);
        }
    };
    fetchPosters();
  }, []);

  // Auto-slide logic (Only runs if multiple posters)
  useEffect(() => {
    if (posters.length <= 1) return;
    
    const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % posters.length);
    }, 5000); // 5 seconds per slide
    
    return () => clearInterval(interval);
  }, [posters.length]);

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % (posters.length || 1));
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + (posters.length || 1)) % (posters.length || 1));

  // Determine what to show: Database Poster OR Default
  const current = posters.length > 0 ? posters[currentIndex] : defaultPoster;

  return (
    <div className="relative h-[80vh] w-full overflow-hidden bg-gray-900 group">
      {/* Background Image with Fade Transition */}
      {/* We map over posters to create DOM elements for transition effect, or just show current */}
      <div className="absolute inset-0">
         <img 
            src={current.imageUrl} 
            alt="Hero Banner" 
            className="w-full h-full object-cover opacity-90 transition-opacity duration-700 ease-in-out"
            key={current.imageUrl} // Key change triggers React animation
         />
      </div>
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Content */}
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
        <div className="max-w-xl text-white">
          <span className="text-sm font-bold tracking-widest uppercase mb-4 block text-gray-100 drop-shadow-md">
            New Collection
          </span>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight drop-shadow-lg">
            {/* Logic: If poster has title, use it. Else use default text. */}
            {current.title || "Comfort is the \n new Luxury."}
          </h1>
          <p className="text-lg md:text-xl mb-8 text-gray-100 drop-shadow-md">
             {current.subtitle || "Discover our latest range of premium cotton essentials designed for your everyday life."}
          </p>
          <Link 
            to={current.link || "/shop"} 
            className="inline-flex items-center px-8 py-4 bg-white text-black font-bold text-sm uppercase tracking-wider hover:bg-black hover:text-white transition-colors duration-300 rounded-sm"
          >
            Shop Now <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Slider Controls (Only show if > 1 poster) */}
      {posters.length > 1 && (
          <>
            <button 
                onClick={prevSlide} 
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 p-3 rounded-full text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
            >
                <ChevronLeft size={32} />
            </button>
            <button 
                onClick={nextSlide} 
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 p-3 rounded-full text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
            >
                <ChevronRight size={32} />
            </button>
            
            {/* Dots Indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
                {posters.map((_, idx) => (
                    <button 
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                            idx === currentIndex ? 'bg-white w-8' : 'bg-white/40 w-2 hover:bg-white/60'
                        }`}
                    />
                ))}
            </div>
          </>
      )}
    </div>
  );
};

export default Hero;