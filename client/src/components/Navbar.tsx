import { ShoppingBag, User, Search, Menu, X, LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../store/store";
import { logout } from "../store/authSlice";

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Search UI State
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?q=${searchQuery}`);
      setShowSearch(false);
      setSearchQuery("");
      setIsMobileMenuOpen(false); // Close mobile menu if open
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 1. Logo (Z-Index ensures it stays above search bar on mobile if needed) */}
          <Link to="/" className="flex items-center gap-2 group z-20">
            <div className="bg-black text-white p-1.5 rounded-md group-hover:rotate-3 transition-transform">
              <ShoppingBag size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900">
              URBANIEGH
            </span>
          </Link>

          {/* 2. Desktop Navigation (Hidden when search is open) */}
          <div
            className={`hidden md:flex space-x-8 transition-opacity duration-200 ${
              showSearch ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          >
            <Link
              to="/shop"
              className="text-sm font-medium text-gray-700 hover:text-black transition-colors"
            >
              All Products
            </Link>
            <Link
              to="/shop?sort=newest"
              className="text-sm font-medium text-gray-700 hover:text-black transition-colors"
            >
              New Arrivals
            </Link>
            <Link
              to="/shop?sort=best_selling"
              className="text-sm font-medium text-gray-700 hover:text-black transition-colors"
            >
              Best Sellers
            </Link>
          </div>

          {/* 3. Integrated Search Bar (Desktop Overlay) */}
          <div
            className={`absolute left-0 right-0 top-0 h-16 bg-white flex items-center justify-center transition-transform duration-300 z-10 ${
              showSearch ? "translate-y-0" : "-translate-y-full"
            }`}
          >
            <div className="w-full max-w-2xl px-4 relative">
              <form onSubmit={handleSearchSubmit}>
                <Search
                  className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  ref={searchInputRef}
                  className="w-full bg-gray-50 border-none rounded-full py-2 pl-12 pr-10 focus:ring-1 focus:ring-black outline-none"
                  placeholder="Search for products (e.g. 'Cotton Tshirt')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => !searchQuery && setShowSearch(false)} // Close if empty and user clicks away
                />
              </form>
              <button
                onClick={() => setShowSearch(false)}
                className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
              >
                <X size={20} />
              </button>
            </div>
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
                  {user?.roles?.length > 0 && (
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
                    My Orders
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
          </div>
        )}
      </div>

      {/* 7. Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 absolute w-full left-0 shadow-lg h-screen z-40">
          <div className="py-2">
            <Link
              to="/shop"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-50"
            >
              All Products
            </Link>
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

                {user?.roles?.length > 0 && (
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
