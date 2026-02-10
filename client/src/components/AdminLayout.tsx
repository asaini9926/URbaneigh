import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, ShoppingCart, Package, Users, LogOut, Ticket, Megaphone, BarChart3, Video } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import { ShieldAlert } from 'lucide-react'; // Add Icon
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { Tags, FolderTree } from 'lucide-react';

const AdminLayout = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const isSuperAdmin = user?.roles.includes('SuperAdmin');

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: ShoppingBag, label: 'Orders', path: '/admin/orders' },
    { icon: Package, label: 'Products', path: '/admin/products' },
    { icon: Users, label: 'Customers', path: '/admin/users' },
    { icon: ShoppingCart, label: 'Active Carts', path: '/admin/carts' },
    { icon: FolderTree, label: 'Categories', path: '/admin/categories' },
    { icon: Tags, label: 'Brands', path: '/admin/brands' },
    { icon: Ticket, label: 'Coupons', path: '/admin/coupons' },
    { icon: Megaphone, label: 'Banners', path: '/admin/posters' },
    { icon: Video, label: 'Videos', path: '/admin/videos' },
    { icon: Ticket, label: 'Returns', path: '/admin/returns' },
    { icon: ShoppingBag, label: 'COD Reconciliation', path: '/admin/reconciliation' },
    { icon: Users, label: 'Subscribers', path: '/admin/subscribers' },
  ];

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  if (isSuperAdmin) {
    menuItems.push({ icon: ShieldAlert, label: 'Roles & Permissions', path: '/admin/roles' });
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar - Fixed height with scroll */}
      <aside className="w-64 bg-black text-white h-screen fixed left-0 top-0 hidden md:flex flex-col overflow-y-auto z-10 transition-all custom-scrollbar">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold tracking-wider">URBANIEGH <span className="text-xs text-gray-400 block">ADMIN PANEL</span></h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${location.pathname === item.path ? 'bg-white text-black font-bold' : 'text-gray-400 hover:text-white hover:bg-gray-900'
                }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button onClick={() => dispatch(logout())} className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-gray-900 w-full rounded-md transition-colors">
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 p-8">
        <Outlet /> {/* This is where child pages like Orders/Dashboard will render */}
      </main>
    </div>
  );
};

export default AdminLayout;