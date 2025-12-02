import { ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

// Define what a Product looks like (matching your Backend API)
interface ProductProps {
    id: number;
    title: string;
    variants: { price: string; images: { url: string }[] }[];
    category: { name: string };
}

const ProductCard = ({ product }: { product: ProductProps }) => {
  // Get the first variant's details (Price & Image)
  const mainVariant = product.variants[0];
  const price = mainVariant?.price;
  // Use placeholder if no image exists yet
  const image = mainVariant?.images[0]?.url || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1780&auto=format&fit=crop';

  return (
    <div className="group cursor-pointer">
      <div className="relative overflow-hidden aspect-[3/4] bg-gray-100 mb-4">
        {/* Product Image */}
        <img 
            src={image} 
            alt={product.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Quick Add Button (Appears on Hover) */}
        <button className="absolute bottom-4 right-4 bg-white p-3 rounded-full shadow-lg translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black hover:text-white">
            <ShoppingCart size={20} />
        </button>
      </div>

      {/* Product Info */}
      <div>
        <p className="text-xs text-gray-500 mb-1">{product.category.name}</p>
        <h3 className="font-medium text-gray-900 group-hover:text-gray-600 transition-colors">
            <Link to={`/product/${product.id}`}>{product.title}</Link>
        </h3>
        <p className="mt-1 font-semibold text-gray-900">₹{price}</p>
      </div>
    </div>
  );
};

export default ProductCard;