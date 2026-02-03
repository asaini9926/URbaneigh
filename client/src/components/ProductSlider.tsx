import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from './ProductCard';
import { Link } from 'react-router-dom';

interface ProductSliderProps {
  title: string;
  subtitle?: string;
  products: any[];
  link?: string;
}

const ProductSlider = ({ title, subtitle, products, link }: ProductSliderProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
        const { current } = scrollRef;
        const scrollAmount = 300; // Adjust scroll amount
        if (direction === 'left') {
            current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        } else {
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    }
  };

  if(!products || products.length === 0) return null;

  return (
    <div className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-8">
            <div className='max-w-2xl'>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>
                {subtitle && <p className="text-gray-500">{subtitle}</p>}
            </div>
            
            <div className="flex gap-4 items-center">
                {link && (
                    <Link to={link} className='hidden md:block text-sm font-bold border-b border-black pb-0.5 hover:text-gray-600 hover:border-gray-600 transition-colors mr-4'>
                        View All
                    </Link>
                )}
                <div className="flex gap-2">
                    <button 
                        onClick={() => scroll('left')}
                        className="p-2 border border-gray-200 rounded-full hover:bg-black hover:text-white transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button 
                         onClick={() => scroll('right')}
                        className="p-2 border border-gray-200 rounded-full hover:bg-black hover:text-white transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </div>

        <div 
            ref={scrollRef} 
            className="flex gap-6 overflow-x-auto pb-8 snap-x scrollbar-hide -mx-4 px-4 scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
            {products.map((product) => (
                <div key={product.id} className="min-w-[200px] md:min-w-[240px] snap-center">
                    <ProductCard product={product} />
                </div>
            ))}
        </div>
        
        {link && (
             <Link to={link} className='md:hidden block text-center mt-4 text-sm font-bold underline'>
                View All {title}
            </Link>
        )}

      </div>
    </div>
  );
};

export default ProductSlider;
