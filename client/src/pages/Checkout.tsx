import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../store/store";
import { clearCart } from "../store/cartSlice";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";
import { QrCode, Truck, CreditCard, ShoppingBag } from "lucide-react";

const Checkout = () => {
  const { items, totalAmount } = useSelector((state: RootState) => state.cart);
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState("");

  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    address: "",
    city: "",
    pincode: "",
    phone: "",
  });

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      const res = await api.post("/coupons/verify", {
        code: couponCode,
        cartTotal: totalAmount,
      });
      setDiscount(res.data.discountAmount);
      setAppliedCoupon(res.data.code);
      alert(`Coupon Applied! You saved ₹${res.data.discountAmount}`);
    } catch (err: any) {
      alert(err.response?.data?.error || "Invalid Coupon");
      setDiscount(0);
      setAppliedCoupon("");
    }
  };

  const [paymentMethod, setPaymentMethod] = useState<"COD" | "QR_UPI">("COD");
  const [transactionId, setTransactionId] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if empty cart
  if (items.length === 0) {
    navigate("/cart");
    return null;
  }

  const shipping = totalAmount > 999 ? 0 : 99;
  const finalTotal = totalAmount + shipping - discount;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderData = {
        items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
        shippingAddress: formData,
        paymentMethod,
        transactionId: paymentMethod === "QR_UPI" ? transactionId : null,
      };

      const res = await api.post("/orders", orderData);

      if (res.status === 201) {
        alert(`Order Placed! ID: ${res.data.orderNumber}`);
        dispatch(clearCart()); // Empty the cart
        navigate("/"); // In future, navigate to /order-success
      }
    } catch (error: any) {
      alert(error.response?.data?.error || "Order Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <form
          onSubmit={handlePlaceOrder}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12"
        >
          {/* Left: Address & Payment */}
          <div className="space-y-8">
            {/* 1. Shipping Address */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Truck className="text-black" />
                <h2 className="text-xl font-bold">Shipping Address</h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <input
                  required
                  placeholder="Full Name"
                  className="border p-3 rounded-md"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                />
                <input
                  required
                  placeholder="Full Address (House No, Street)"
                  className="border p-3 rounded-md"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    required
                    placeholder="City"
                    className="border p-3 rounded-md"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                  />
                  <input
                    required
                    placeholder="Pincode"
                    className="border p-3 rounded-md"
                    value={formData.pincode}
                    onChange={(e) =>
                      setFormData({ ...formData, pincode: e.target.value })
                    }
                  />
                </div>
                <input
                  required
                  placeholder="Phone Number"
                  className="border p-3 rounded-md"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Coupon Input */}
            <div className="flex gap-2 mb-4">
              <input
                placeholder="Promo Code"
                className="border p-2 rounded text-sm flex-1 uppercase"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={!!appliedCoupon} // Disable if already applied
              />
              {appliedCoupon ? (
                <button
                  onClick={() => {
                    setAppliedCoupon("");
                    setDiscount(0);
                    setCouponCode("");
                  }}
                  className="bg-red-500 text-white px-3 rounded text-sm font-bold"
                >
                  X
                </button>
              ) : (
                <button
                  onClick={handleApplyCoupon}
                  className="bg-gray-900 text-white px-4 rounded text-sm font-bold"
                >
                  Apply
                </button>
              )}
            </div>

            {/* Display Discount in Summary List */}
            {discount > 0 && (
              <div className="flex justify-between text-green-600 font-medium">
                <span>Discount ({appliedCoupon})</span>
                <span>-₹{discount}</span>
              </div>
            )}

            {/* 2. Payment Method */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <CreditCard className="text-black" />
                <h2 className="text-xl font-bold">Payment Method</h2>
              </div>

              <div className="space-y-4">
                {/* COD Option */}
                <label
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                    paymentMethod === "COD"
                      ? "border-black bg-gray-50"
                      : "border-gray-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    className="w-5 h-5 accent-black"
                    checked={paymentMethod === "COD"}
                    onChange={() => setPaymentMethod("COD")}
                  />
                  <span className="ml-3 font-medium">
                    Cash on Delivery (COD)
                  </span>
                </label>

                {/* QR Option */}
                <label
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                    paymentMethod === "QR_UPI"
                      ? "border-black bg-gray-50"
                      : "border-gray-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    className="w-5 h-5 accent-black"
                    checked={paymentMethod === "QR_UPI"}
                    onChange={() => setPaymentMethod("QR_UPI")}
                  />
                  <span className="ml-3 font-medium">Pay via QR / UPI</span>
                </label>

                {/* QR Display & Input */}
                {paymentMethod === "QR_UPI" && (
                  <div className="mt-4 p-4 bg-gray-100 rounded-lg text-center">
                    <p className="text-sm text-gray-600 mb-2">
                      Scan to Pay <strong>₹{finalTotal}</strong>
                    </p>
                    <div className="bg-white p-2 inline-block rounded-md mb-3">
                      <QrCode size={120} /> {/* Placeholder QR */}
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Urbaniegh Business UPI
                    </p>

                    <input
                      required={paymentMethod === "QR_UPI"}
                      placeholder="Enter Transaction ID (UTR)"
                      className="w-full border p-2 rounded-md text-sm"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1 text-left">
                      * Admin will verify this ID before shipping.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="bg-white p-6 rounded-lg shadow-sm h-fit sticky top-24">
            <div className="flex items-center gap-3 mb-6">
              <ShoppingBag className="text-black" />
              <h2 className="text-xl font-bold">Order Summary</h2>
            </div>

            <div className="space-y-4 max-h-60 overflow-y-auto mb-6 pr-2">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <img
                    src={item.image}
                    className="w-16 h-16 object-cover rounded-md"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-gray-500">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-bold">
                    ₹{item.price * item.quantity}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{totalAmount}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{shipping === 0 ? "Free" : `₹${shipping}`}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                <span>Total</span>
                <span>₹{finalTotal}</span>
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full mt-6 bg-black text-white h-12 rounded-lg font-bold hover:bg-gray-800 transition-colors disabled:opacity-70"
            >
              {loading ? "Processing..." : `Place Order (₹${finalTotal})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
