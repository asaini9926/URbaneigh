import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
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
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPosters from "./pages/admin/AdminPosters";
import Footer from "./components/Footer";
import RefundPolicy from "./pages/legal/RefundPolicy";
import ShippingPolicy from "./pages/legal/ShippingPolicy";
import TermsPolicy from "./pages/legal/TermsPolicy";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import OrderHistory from "./pages/OrderHistory";
import OrderDetails from "./pages/OrderDetails";
import ReturnRequest from "./pages/ReturnRequest";
import ReturnTracking from "./pages/ReturnTracking";
import AdminReturns from "./pages/admin/AdminReturns";
import AdminReconciliation from "./pages/admin/AdminReconciliation";
import NotificationCenter from "./pages/NotificationCenter";
import AnalyticsDashboard from "./pages/admin/AnalyticsDashboard";
import AdminVideos from "./pages/admin/AdminVideos";
import AdminSubscribers from "./pages/admin/AdminSubscribers";
import ScrollToTop from "./components/ScrollToTop";
import AdminOrderDetails from "./pages/admin/AdminOrderDetails"; // Import AdminOrderDetails

// Separate component to handle conditional Layout (Navbar/Footer)
const ContentWrapper = () => {
  const location = useLocation();

  // Check if we are in the admin section
  const isAdminRoute = location.pathname.startsWith("/admin");

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
          <Route
            path="/refund-policy"
            element={
              <RefundPolicy />
            }
          />
          <Route
            path="/shipping-policy"
            element={
              <ShippingPolicy />
            }
          />
          <Route
            path="/terms-conditions"
            element={
              <TermsPolicy />
            }
          />
          <Route
            path="/privacy-policy"
            element={
              <PrivacyPolicy />
            }
          />

          {/* Protected Routes */}
          <Route element={<RequireAuth />}>
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<NotificationCenter />} />
            <Route path="/order-history" element={<OrderHistory />} />
            <Route path="/order/:orderId" element={<OrderDetails />} />
            <Route path="/return/:orderId" element={<ReturnRequest />} />
            <Route path="/return-tracking/:returnId" element={<ReturnTracking />} />

            {/* Admin Routes (Layout handled by AdminLayout) */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="orders/:id" element={<AdminOrderDetails />} /> {/* New Route */}
              <Route path="products" element={<AdminProducts />} />
              <Route path="products/new" element={<AddProduct />} />
              <Route path="products/edit/:id" element={<EditProduct />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="roles" element={<AdminRoles />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="brands" element={<AdminBrands />} />
              <Route path="coupons" element={<AdminCoupons />} />
              <Route path="posters" element={<AdminPosters />} />
              <Route path="videos" element={<AdminVideos />} />
              <Route path="returns" element={<AdminReturns />} />
              <Route path="reconciliation" element={<AdminReconciliation />} />
              <Route path="analytics" element={<AnalyticsDashboard />} />
              <Route path="subscribers" element={<AdminSubscribers />} />
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
      <ScrollToTop />
      <div className="min-h-screen bg-white text-gray-900 font-sans">
        <ContentWrapper />
      </div>
    </Router>
  );
}

export default App;
