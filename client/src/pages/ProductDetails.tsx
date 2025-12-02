import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import { useDispatch } from "react-redux";
import { addToCart } from "../store/cartSlice";
import { Truck, ShieldCheck, ShoppingBag } from "lucide-react";

const ProductDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Image State
  const [activeImage, setActiveImage] = useState<string>("");

  // Selection State
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");

  // Helpers to find available options
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await api.get(`/products/${id}`);
        const p = res.data;
        setProduct(p);

        // Extract unique colors and sizes
        const colors = [...new Set(p.variants.map((v: any) => v.color))].filter(Boolean) as string[];
        const sizes = [...new Set(p.variants.map((v: any) => v.size))].filter(Boolean) as string[];

        setAvailableColors(colors);
        setAvailableSizes(sizes);

        // Auto-select first options
        if (colors.length > 0) setSelectedColor(colors[0]);
        if (sizes.length > 0) setSelectedSize(sizes[0]);
      } catch (err) {
        console.error("Error loading product", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  // Find the specific variant based on current selection
  const currentVariant = product?.variants.find(
    (v: any) => v.color === selectedColor && v.size === selectedSize
  );

  // Update Active Image when Variant changes
  useEffect(() => {
    if (currentVariant && currentVariant.images?.length > 0) {
        setActiveImage(currentVariant.images[0].url);
    } else if (product && product.variants[0]?.images?.length > 0) {
        setActiveImage(product.variants[0].images[0].url);
    } else {
        setActiveImage(""); // Reset or keep previous if needed
    }
  }, [selectedColor, selectedSize, product, currentVariant]);

  const isValidCombination = !!currentVariant;

  const handleAddToCart = () => {
    if (!currentVariant) return;

    dispatch(
      addToCart({
        id: currentVariant.id,
        productId: product.id,
        title: product.title,
        price: currentVariant.price,
        image: currentVariant.images?.[0]?.url || "https://via.placeholder.com/500",
        color: selectedColor,
        size: selectedSize,
        quantity: 1,
        maxStock: currentVariant.inventory?.quantity || 0,
      })
    );

    alert("Added to cart!");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center">Product not found</div>;

  const displayPrice = currentVariant ? currentVariant.price : product.variants[0]?.price;
  
  // Use activeImage state for display, fallback to placeholder
  const finalDisplayImage = activeImage || "https://via.placeholder.com/500";

  // Get current variant's image list (or fallback to first variant's images)
  const currentImages = currentVariant?.images?.length 
    ? currentVariant.images 
    : product?.variants[0]?.images || [];

  return (
    <div className="bg-white min-h-screen pt-10 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          
          {/* LEFT: Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden border border-gray-100">
              <img
                src={finalDisplayImage}
                alt={product.title}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
            </div>

            {/* Thumbnail Strip */}
            {currentImages.length > 0 && (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {currentImages.map((img: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(img.url)}
                    className={`w-20 h-24 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all 
                        ${activeImage === img.url ? "border-black" : "border-transparent hover:border-gray-300"}`}
                  >
                    <img src={img.url} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Details */}
          <div className="pt-4">
            <div className="mb-8 border-b border-gray-100 pb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.title}</h1>
              <div className="flex items-center gap-4 mb-6">
                <span className="text-2xl font-medium text-gray-900">₹{displayPrice}</span>
                {currentVariant?.mrp > displayPrice && (
                  <span className="text-lg text-gray-400 line-through">₹{currentVariant.mrp}</span>
                )}
                <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-bold uppercase tracking-wide">
                  In Stock
                </span>
              </div>
              <p className="text-gray-600 leading-relaxed">{product.description}</p>
            </div>

            {/* Selectors */}
            <div className="space-y-6 mb-8">
              {/* Colors */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Color: <span className="text-gray-500">{selectedColor}</span>
                </h3>
                <div className="flex flex-wrap gap-3">
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 border rounded-md text-sm transition-all
                        ${selectedColor === color ? "border-black bg-black text-white" : "border-gray-200 hover:border-black text-gray-900"}`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sizes */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Size: <span className="text-gray-500">{selectedSize}</span>
                </h3>
                <div className="flex flex-wrap gap-3">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`w-12 h-12 flex items-center justify-center border rounded-full text-sm font-medium transition-all
                        ${selectedSize === size ? "border-black bg-black text-white" : "border-gray-200 hover:border-black text-gray-900"}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Add to Cart Action */}
            <div className="flex gap-4 mb-8">
              <button
                onClick={handleAddToCart}
                disabled={!isValidCombination}
                className="flex-1 bg-black text-white h-14 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ShoppingBag size={20} />
                {isValidCombination ? "Add to Cart" : "Unavailable"}
              </button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-4 pt-8 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <Truck className="text-gray-400" size={20} />
                <span className="text-sm text-gray-600">Free delivery above ₹999</span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-gray-400" size={20} />
                <span className="text-sm text-gray-600">Secure Payment</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;