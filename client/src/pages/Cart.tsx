import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import { removeItemFromCart, updateItemQuantity } from '../store/cartSlice';
import { Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Cart = () => {
    const { items, totalAmount } = useSelector((state: RootState) => state.cart);
    const dispatch = useDispatch();

    const shipping = totalAmount > 999 ? 0 : 99;
    const finalTotal = totalAmount + shipping;

    if (items.length === 0) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center bg-gray-50 px-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Your bag is empty</h2>
                <p className="text-gray-500 mb-8">Looks like you haven't added anything to your cart yet.</p>
                <Link to="/" className="px-8 py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors">
                    Start Shopping
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Bag</h1>

                <div className="flex flex-col lg:flex-row gap-12">

                    {/* Left: Cart Items */}
                    <div className="lg:w-2/3 space-y-4">
                        {items.map((item) => (
                            <div key={item.id} className="bg-white p-6 rounded-lg shadow-sm flex gap-6 items-center">
                                {/* Image */}
                                <div className="w-24 h-32 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                </div>

                                {/* Details */}
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-medium text-gray-900">
                                                <Link to={`/product/${item.slug}`} className="hover:text-gray-600 transition-colors">
                                                    {item.title}
                                                </Link>
                                            </h3>
                                            <p className="text-sm text-gray-500 mt-1">{item.color} | {item.size}</p>
                                        </div>
                                        <p className="font-bold text-gray-900">₹{item.price * item.quantity}</p>
                                    </div>

                                    <div className="flex justify-between items-end mt-4">
                                        {/* Quantity Controls */}
                                        <div className="flex items-center border border-gray-200 rounded-md">
                                            <button
                                                // @ts-ignore
                                                onClick={() => dispatch(updateItemQuantity({ id: item.id, quantity: item.quantity - 1 }))}
                                                className="p-2 hover:bg-gray-50 text-gray-600"
                                            >
                                                <Minus size={16} />
                                            </button>
                                            <span className="px-4 text-sm font-medium text-gray-900">{item.quantity}</span>
                                            <button
                                                // @ts-ignore
                                                onClick={() => dispatch(updateItemQuantity({ id: item.id, quantity: item.quantity + 1 }))}
                                                disabled={item.quantity >= item.maxStock}
                                                className="p-2 hover:bg-gray-50 text-gray-600 disabled:opacity-50"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>

                                        {/* Remove Button */}
                                        <button
                                            // @ts-ignore
                                            onClick={() => dispatch(removeItemFromCart(item.id))}
                                            className="text-gray-400 hover:text-red-500 transition-colors p-2"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right: Order Summary */}
                    <div className="lg:w-1/3">
                        <div className="bg-white p-6 rounded-lg shadow-sm sticky top-24">
                            <h2 className="text-lg font-bold text-gray-900 mb-6">Order Summary</h2>

                            <div className="space-y-4 text-sm">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span>₹{totalAmount}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Shipping</span>
                                    <span>{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
                                </div>
                                <div className="border-t border-gray-100 pt-4 flex justify-between font-bold text-lg text-gray-900">
                                    <span>Total</span>
                                    <span>₹{finalTotal}</span>
                                </div>
                            </div>

                            <Link
                                to="/checkout"
                                className="w-full mt-8 bg-black text-white h-12 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
                            >
                                Proceed to Checkout <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Cart;