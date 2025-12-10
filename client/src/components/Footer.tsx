import {
  ShoppingBag,
  // Facebook,
  Twitter,
  Instagram,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* 1. Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-white text-black p-1.5 rounded-md">
                <ShoppingBag size={20} />
              </div>
              <span className="font-bold text-xl tracking-tight">
                URBANIEGH
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Redefining comfort with premium cotton essentials. Designed for
              modern living, crafted for everyday luxury.
            </p>
            <div className="flex gap-4 pt-2">
              <a
                href="https://www.facebook.com/share/17bye7a34c/"
                className="text-gray-400 hover:text-white transition-colors"
              >
                {/* <Facebook size={20} />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors"
              > */}
                <Twitter size={20} />
              </a>
              <a
                href="https://www.instagram.com/urbaneighfashions"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {/* 2. Shop Links */}
          <div>
            <h3 className="font-bold text-lg mb-6">Shop</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li>
                <Link
                  to="/shop?sort=newest"
                  className="hover:text-white transition-colors"
                >
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link
                  to="/shop?sort=best_selling"
                  className="hover:text-white transition-colors"
                >
                  Best Sellers
                </Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-white transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  to="/shop?category=men"
                  className="hover:text-white transition-colors"
                >
                  Men
                </Link>
              </li>
              <li>
                <Link
                  to="/shop?category=women"
                  className="hover:text-white transition-colors"
                >
                  Women
                </Link>
              </li>
            </ul>
          </div>

          {/* 3. Support */}
          <div>
            <h3 className="font-bold text-lg mb-6">Support</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li>
                <Link
                  to="/profile"
                  className="hover:text-white transition-colors"
                >
                  My Account
                </Link>
              </li>
              <li>
                <Link
                  to="/shipping-policy"
                  className="hover:text-white transition-colors"
                >
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/refund-policy"
                  className="hover:text-white transition-colors"
                >
                  Returns & Refunds
                </Link>
              </li>
              <li>
                <Link
                  to="/terms-conditions"
                  className="hover:text-white transition-colors"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy-policy"
                  className="hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* 4. Contact */}
          <div>
            <h3 className="font-bold text-lg mb-6">Contact Us</h3>
            <ul className="space-y-4 text-sm text-gray-400">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="mt-0.5 shrink-0" />
                <span>
                  123 Fashion Street, Tech Park,
                  <br />
                  Bangalore, India 560001
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} />
                <span>+91  63090 30535</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} />
                <span>urbaneigh@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} Urbaniegh. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white">
              Terms of Service
            </a>
            <a href="#" className="hover:text-white">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
