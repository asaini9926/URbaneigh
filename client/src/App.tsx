import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Home from "./pages/Home";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import AdminLayout from "./components/AdminLayout";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminProducts from "./pages/admin/AdminProducts";
import AddProduct from "./pages/admin/AddProduct";
import Profile from "./pages/Profile";
import AdminRoles from "./pages/admin/AdminRoles";
import AdminUsers from "./pages/admin/AdminUsers";
import RequireAuth from "./components/RequireAuth";
import Register from "./pages/Register";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminBrands from "./pages/admin/AdminBrands";
import Shop from "./pages/Shop";
import AdminCoupons from "./pages/admin/AdminCoupons";
import EditProduct from "./pages/admin/EditProduct";
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPosters from './pages/admin/AdminPosters';
import Footer from "./components/Footer";

// Separate component to handle conditional Layout (Navbar/Footer)
const ContentWrapper = () => {
    const location = useLocation();
    
    // Check if we are in the admin section
    const isAdminRoute = location.pathname.startsWith('/admin');

    return (
        <div className="flex flex-col min-h-screen">
            {/* Show Public Navbar only if NOT in Admin panel */}
            {!isAdminRoute && <Navbar />}
            
            <div className="flex-grow">
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/product/:id" element={<ProductDetails />} />
                    <Route path="/cart" element={<Cart />} />
                    
                    {/* Protected Routes */}
                    <Route element={<RequireAuth />}>
                        <Route path="/checkout" element={<Checkout />} />
                        <Route path="/profile" element={<Profile />} />
                        
                        {/* Admin Routes (Layout handled by AdminLayout) */}
                        <Route path="/admin" element={<AdminLayout />}>
                            <Route index element={<AdminDashboard />} />
                            <Route path="orders" element={<AdminOrders />} />
                            <Route path="products" element={<AdminProducts />} />
                            <Route path="products/new" element={<AddProduct />} />
                            <Route path="products/edit/:id" element={<EditProduct />} />
                            <Route path="users" element={<AdminUsers />} />
                            <Route path="roles" element={<AdminRoles />} />
                            <Route path="categories" element={<AdminCategories />} />
                            <Route path="brands" element={<AdminBrands />} />
                            <Route path="coupons" element={<AdminCoupons />} />
                            <Route path="posters" element={<AdminPosters />} />
                        </Route>
                    </Route>
                </Routes>
            </div>

            {/* Show Public Footer only if NOT in Admin panel */}
            {!isAdminRoute && <Footer />}
        </div>
    );
};

function App() {
  return (
    <Router>
        <div className="min-h-screen bg-white text-gray-900 font-sans">
            <ContentWrapper />
        </div>
    </Router>
  );
}

export default App;