import {
  ShoppingBag,
  User,
  Search,
  Menu,
  X,
  LogOut,
  ChevronDown,
} from "lucide-react";
import logo from "../assets/logo.png";
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../store/store";
import { logout } from "../store/authSlice";
import api from "../api/axios";

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Search UI State
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth,
  );
  const { totalQuantity } = useSelector((state: RootState) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Auto-focus input when search bar opens
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Debounce Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 2) {
        try {
          const res = await api.get(`/products?search=${searchQuery}&limit=5`);
          setSearchSuggestions(res.data.data);
        } catch (error) {
          console.error("Search suggestion error", error);
        }
      } else {
        setSearchSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?q=${searchQuery}`);
      setShowSearch(false);
      setSearchQuery("");
      setSearchSuggestions([]);
      setIsMobileMenuOpen(false); // Close mobile menu if open
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
    setIsMobileMenuOpen(false);
  };

  // Fetch Categories Dynamically
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("/master/categories");
        const cats = Array.isArray(res.data)
          ? res.data
          : res.data.data || res.data.categories || [];

        setCategories(cats);
      } catch (err) {
        console.error("Failed to fetch menu categories", err);
      }
    };
    fetchCategories();
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 1. Logo (Z-Index ensures it stays above search bar on mobile if needed) */}
          <Link to="/" className="flex items-center gap-2 group z-20">
            <img
              src={logo}
              alt="Urbaneigh"
              className="h-12 w-auto object-contain"
            />
            <span className="font-bold text-xl tracking-tight text-gray-900">
              URBANIEGH
            </span>
          </Link>

          {/* 2. Desktop Navigation (Hidden when search is open) */}
          <div
            className={`hidden md:flex space-x-8 transition-opacity duration-200 ${showSearch ? "opacity-0 pointer-events-none" : "opacity-100"
              }`}
          >
            {categories.map((cat) => (
              <div key={cat.id} className="relative group">
                <button
                  onClick={() => navigate(`/shop?category=${cat.id}`)}
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 group-hover:text-black py-5 uppercase tracking-wide"
                >
                  {cat.name}{" "}
                  <ChevronDown
                    size={14}
                    className="group-hover:rotate-180 transition-transform"
                  />
                </button>

                {/* Submenu */}
                {cat.children && cat.children.length > 0 && (
                  <div className="absolute top-full left-0 w-48 bg-white border border-gray-100 shadow-xl rounded-b-md py-2 hidden group-hover:block animate-fade-in">
                    {cat.children.map((sub: any) => (
                      <Link
                        key={sub.id}
                        to={`/shop?category=${sub.id}`}
                        className="block px-4 py-2 text-sm text-gray-600 hover:text-black hover:bg-gray-50"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <Link
              to="/shop?sort=newest"
              className="text-sm font-medium text-gray-700 hover:text-black transition-colors flex items-center"
            >
              New Arrivals
            </Link>
            <Link
              to="/shop?sort=best_selling"
              className="text-sm font-medium text-gray-700 hover:text-black transition-colors flex items-center"
            >
              Best Sellers
            </Link>
          </div>

          {/* 3. Integrated Search Bar (Desktop Overlay) */}
          <div
            className={`absolute left-0 right-0 top-0 bg-white flex flex-col items-center pt-3 transition-transform duration-300 z-10 shadow-sm ${showSearch ? "translate-y-0" : "-translate-y-full"
              }`}
          >
            <div className="w-full max-w-2xl px-4 relative flex items-center h-12">
              <form onSubmit={handleSearchSubmit} className="w-full relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  ref={searchInputRef}
                  className="w-full bg-gray-50 border-none rounded-full py-2.5 pl-12 pr-10 focus:ring-1 focus:ring-black outline-none text-sm"
                  placeholder="Search for products (e.g. 'Cotton Tshirt')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                //   onBlur={() => setTimeout(() => setShowSearch(false), 200)} // Removed to allow clicking suggestions
                />
              </form>
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchSuggestions([]);
                  setSearchQuery("");
                }}
                className="ml-4 text-gray-400 hover:text-black"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Suggestions Dropdown */}
            {searchSuggestions.length > 0 && (
              <div className="w-full max-w-2xl bg-white border-t border-gray-100 shadow-lg rounded-b-lg overflow-hidden">
                {searchSuggestions.map((product) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.slug}`}
                    onClick={() => {
                      setShowSearch(false);
                      setSearchSuggestions([]);
                      setSearchQuery("");
                    }}
                    className="flex items-center gap-4 p-3 hover:bg-gray-50 transition-colors border-b last:border-0"
                  >
                    <img
                      src={
                        product.variants?.[0]?.images?.[0]?.url ||
                        "https://via.placeholder.com/50"
                      }
                      alt={product.title}
                      className="w-10 h-10 object-cover rounded"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {product.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        ₹{product.variants?.[0]?.price}
                      </p>
                    </div>
                  </Link>
                ))}
                <Link
                  to={`/shop?q=${searchQuery}`}
                  onClick={() => {
                    setShowSearch(false);
                    setSearchSuggestions([]);
                    setSearchQuery("");
                  }}
                  className="block w-full text-center py-2 text-xs font-bold text-gray-500 hover:text-black hover:bg-gray-50"
                >
                  View all results for "{searchQuery}"
                </Link>
              </div>
            )}
          </div>

          {/* 4. Desktop Icons */}
          <div className="hidden md:flex items-center space-x-6 z-20 bg-white pl-4">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="text-gray-500 hover:text-black transition-colors"
            >
              <Search size={20} />
            </button>

            <div className="relative group">
              <button className="text-gray-500 hover:text-black transition-colors flex items-center gap-2 py-2">
                <User size={20} />
                {isAuthenticated && (
                  <span className="text-xs font-semibold">
                    {user?.name?.split(" ")[0]}
                  </span>
                )}
              </button>

              {/* Desktop Dropdown */}
              {isAuthenticated && (
                <div className="absolute right-0 mt-0 w-48 bg-white border border-gray-100 shadow-lg rounded-md py-1 hidden group-hover:block">
                  {user?.roles?.includes('SuperAdmin') && (
                    <Link
                      to="/admin"
                      className="block px-4 py-2 text-sm font-bold text-black hover:bg-gray-50 border-b"
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    My Account
                  </Link>
                  <Link
                    to="/order-history"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    My orders
                  </Link>
                  <Link
                    to="/notifications"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    🔔 Notifications
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                  >
                    Logout
                  </button>
                </div>
              )}
              {!isAuthenticated && (
                <div className="absolute right-0 mt-0 w-32 bg-white border border-gray-100 shadow-lg rounded-md py-1 hidden group-hover:block">
                  <Link
                    to="/login"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>

            <Link
              to="/cart"
              className="text-gray-500 hover:text-black transition-colors relative"
            >
              <ShoppingBag size={20} />
              {totalQuantity > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-black text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {totalQuantity}
                </span>
              )}
            </Link>
          </div>

          {/* 5. Mobile Header Elements */}
          <div className="md:hidden flex items-center gap-4 z-20">
            {/* Mobile Search Toggle */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="text-gray-500"
            >
              <Search size={22} />
            </button>

            <Link
              to="/cart"
              className="text-gray-500 hover:text-black relative"
            >
              <ShoppingBag size={22} />
              {totalQuantity > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-black text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {totalQuantity}
                </span>
              )}
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-900"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* 6. Mobile Search Overlay (Appears below header) */}
        {showSearch && (
          <div className="md:hidden pb-4 px-2">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                autoFocus
                className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 pl-10 text-sm focus:outline-none focus:border-black"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
            </form>
            {/* Mobile Suggestions */}
            {searchSuggestions.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-b mt-1 shadow-lg z-50 absolute right-2 left-2">
                {searchSuggestions.map((product) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    onClick={() => {
                      setShowSearch(false);
                      setSearchSuggestions([]);
                      setSearchQuery("");
                    }}
                    className="flex items-center gap-3 p-2 border-b last:border-0"
                  >
                    <img
                      src={
                        product.variants?.[0]?.images?.[0]?.url ||
                        "https://via.placeholder.com/50"
                      }
                      alt={product.title}
                      className="w-8 h-8 object-cover rounded"
                    />
                    <div>
                      <p className="text-xs font-bold text-gray-900 line-clamp-1">
                        {product.title}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        ₹{product.variants?.[0]?.price}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7. Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 absolute w-full left-0 shadow-lg h-screen z-40 overflow-y-auto pb-20">
          <div className="py-2">
            <Link
              to="/shop"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-50"
            >
              All Products
            </Link>

            {/* Dynamic Mobile Categories */}
            {categories.map((cat) => (
              <div key={cat.id} className="px-4 py-2 bg-gray-50 mt-1">
                <div className="flex justify-between items-center mb-2">
                  <Link
                    to={`/shop?category=${cat.id}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="font-bold text-gray-900 uppercase"
                  >
                    {cat.name}
                  </Link>
                </div>
                {cat.children && cat.children.length > 0 && (
                  <div className="pl-4 space-y-2 border-l-2 border-gray-200 ml-1">
                    {cat.children.map((sub: any) => (
                      <Link
                        key={sub.id}
                        to={`/shop?category=${sub.id}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block text-sm text-gray-600"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <Link
              to="/shop?sort=newest"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-50"
            >
              New Arrivals
            </Link>
            <Link
              to="/shop?sort=best_selling"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-50"
            >
              Best Sellers
            </Link>
          </div>

          <div className="border-t border-gray-100 bg-gray-50 py-4 px-4">
            {isAuthenticated ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white p-2 rounded-full border">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {user?.name}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </div>

                {user?.roles?.includes('SuperAdmin') && (
                  <Link
                    to="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full text-center bg-black text-white py-2 rounded text-sm font-bold"
                  >
                    Admin Dashboard
                  </Link>
                )}

                <Link
                  to="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full text-center bg-white border border-gray-300 text-gray-700 py-2 rounded text-sm font-medium"
                >
                  My Orders
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full text-red-600 py-2 text-sm font-medium"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-center py-2 border border-gray-300 rounded bg-white text-sm font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-center py-2 bg-black text-white rounded text-sm font-bold"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
