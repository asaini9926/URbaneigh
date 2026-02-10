import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../store/store";
import { clearCart } from "../store/cartSlice";
import api from "../api/axios";
import { useNavigate, useLocation } from "react-router-dom";
import { Truck, CreditCard, ShoppingBag, Loader } from "lucide-react";

declare global {
  interface Window {
    Paytm: any;
  }
}

const Checkout = () => {
  const { items: cartItems, totalAmount: cartTotal } = useSelector((state: RootState) => state.cart);
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Check for Direct Buy Item
  const directBuyItem = location.state?.directBuyItem;

  // Determine source of items
  const items = directBuyItem ? [directBuyItem] : cartItems;
  const totalAmount = directBuyItem ? (directBuyItem.price * directBuyItem.quantity) : cartTotal;
  const isDirectBuy = !!directBuyItem;

  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState("");

  // Prod-3 Features State
  const [isSelfDelivery, setIsSelfDelivery] = useState(false);
  const [canSelfDeliver, setCanSelfDeliver] = useState(false);
  const [locating, setLocating] = useState(false);

  const [saveAddress, setSaveAddress] = useState(false);

  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    address: "",
    city: "",
    pincode: "",
    phone: "",
  });

  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  // Fetch User Addresses on Mount
  useEffect(() => {
    if (user) {
      api.get('/user/profile')
        .then(res => {
          const addresses = res.data.addresses || [];
          setSavedAddresses(addresses);

          // Auto-fill default
          const defaultAddr = addresses.find((a: any) => a.isDefault) || addresses[0];
          if (defaultAddr) {
            fillFormData(defaultAddr);
          }
        })
        .catch(err => console.error("Failed to load addresses", err));
    }
  }, [user]);

  const fillFormData = (addr: any) => {
    setSelectedAddressId(addr.id);
    setFormData({
      fullName: addr.name || user?.name || "",
      address: addr.fullAddress,
      city: addr.city,
      pincode: addr.pincode,
      phone: user?.phone || ""
    });
  };

  // Helper to handle selection
  const handleSelectAddress = (addr: any) => {
    fillFormData(addr);
  };

  // Store Coords
  const STORE_COORDS = { latitude: 26.992430391922113, longitude: 75.7632824023283 };

  // Calculate Distance (Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setLocating(true);
    setSelectedAddressId(null); // Clear selection as we are using a new custom location
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // 1. Check Distance for Self Delivery
        const dist = calculateDistance(latitude, longitude, STORE_COORDS.latitude, STORE_COORDS.longitude);
        if (dist <= 15) {
          setCanSelfDeliver(true);
        } else {
          setCanSelfDeliver(false);
          setIsSelfDelivery(false);
        }

        // 2. Reverse Geocode (Google Maps API)
        try {
          const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
          if (apiKey) {
            const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`);
            const data = await res.json();
            if (data.results && data.results.length > 0) {
              const addrComponents = data.results[0].address_components;
              let city = "";
              let pincode = "";

              addrComponents.forEach((comp: any) => {
                if (comp.types.includes("locality")) city = comp.long_name;
                if (comp.types.includes("postal_code")) pincode = comp.long_name;
              });

              setFormData(prev => ({
                ...prev,
                address: data.results[0].formatted_address,
                city: city || prev.city,
                pincode: pincode || prev.pincode
              }));
            }
          } else {
            alert("Google Maps API Key not found. Please enter address manually.");
          }
        } catch (error) {
          console.error("Geocoding failed", error);
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        console.error(error);
        alert("Unable to retrieve your location");
        setLocating(false);
      }
    );
  };

  // Load Paytm script on component mount
  useEffect(() => {
    const script = document.createElement("script");
    const paytmEnv = import.meta.env.VITE_PAYTM_ENV || 'STAGING';
    script.src = paytmEnv === 'PROD'
      ? "https://securegw.paytm.in/merchantpgp/gpay.js"
      : "https://securegw-stage.paytm.in/merchantpgp/gpay.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

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

  const [paymentMethod, setPaymentMethod] = useState<"COD" | "PAYTM">("COD");
  const [loading, setLoading] = useState(false);

  // Redirect if empty items and not loading
  useEffect(() => {
    if (items.length === 0) {
      navigate("/cart");
    }
  }, [items, navigate]);

  if (items.length === 0) return null;

  // Prod-3: Delivery is free (0), but we show 79 - 79 logic
  const shippingChargeDisplay = 79;
  const shippingDiscount = 79; // Logic: Free for you
  // Ideally, total = totalAmount + 79 - 79 - couponDiscount
  const finalTotal = totalAmount - discount; // Net effect is 0 shipping

  const handlePayWithPaytm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: Create order and get Paytm token from backend
      const orderData = {
        items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
        shippingAddress: formData,
        paymentMethod: "PAYTM",
        totalAmount: finalTotal,
        isSelfPickup: isSelfDelivery // Pass this flag
      };

      const response = await api.post("/payments/initiate", orderData);
      const { txnToken, orderId, orderNumber } = response.data;

      // Step 2: Initialize Paytm Checkout
      if (window.Paytm && window.Paytm.CheckoutJS) {
        const config = {
          root: "",
          flow: "DEFAULT",
          data: {
            orderId: orderId,
            token: txnToken,
            tokenType: "TXN_TOKEN",
            amount: String(finalTotal),
          },
          handler: {
            notifyMerchant: async function (eventName: string, data: any) {
              if (eventName === "APP_INITIALIZED") {
                // Paytm app initialized
              } else if (eventName === "TRANSACTION_STATUS") {
                // Verify payment on server
                try {
                  const verifyRes = await api.post("/payments/verify", {
                    orderId,
                    txnToken,
                    response: data,
                  });

                  if (verifyRes.data.status === "success") {
                    alert(`Order Placed! ID: ${orderNumber}`);
                    if (!isDirectBuy) {
                      dispatch(clearCart());
                    }
                    navigate(`/profile`);
                  } else {
                    alert("Payment verification failed. Order cancelled.");
                    navigate("/cart");
                  }
                } catch (err) {
                  console.error("Verification error:", err);
                  alert("Error verifying payment. Please contact support.");
                  navigate("/cart");
                }
              }
            },
          },
        };

        window.Paytm.CheckoutJS.onLoad(function executeAfterLoad() {
          window.Paytm.CheckoutJS.invoke(config);
        });
      } else {
        alert("Paytm SDK not loaded. Please refresh the page.");
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Payment initiation error:", error);
      alert(error.response?.data?.error || "Failed to initiate payment");
      setLoading(false);
    }
  };

  const handlePlaceOrderCOD = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderData = {
        items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
        shippingAddress: formData,
        paymentMethod: "COD",
        isSelfPickup: isSelfDelivery
      };

      const res = await api.post("/orders", orderData);



      if (res.status === 201) {
        // Save Address if requested
        if (saveAddress && !selectedAddressId) {
          try {
            await api.post('/user/address', {
              name: formData.fullName,
              fullAddress: formData.address,
              city: formData.city,
              pincode: formData.pincode,
              state: 'N/A', // Default or derived
              isDefault: savedAddresses.length === 0
            });
          } catch (err) {
            console.error("Failed to save address silently", err);
          }
        }

        alert(`Order Placed! ID: ${res.data.orderNumber}`);
        if (!isDirectBuy) {
          dispatch(clearCart());
        }
        navigate(`/profile`);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || "Order Failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    if (paymentMethod === "PAYTM") {
      handlePayWithPaytm(e);
    } else {
      handlePlaceOrderCOD(e);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          {isDirectBuy ? 'Checkout (Buy Now)' : 'Checkout'}
        </h1>

        <form
          onSubmit={handlePlaceOrder}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12"
        >
          {/* Left: Address & Payment */}
          <div className="space-y-8">
            {/* 1. Shipping Address */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <Truck className="text-black" />
                  <h2 className="text-xl font-bold">Shipping Address</h2>
                </div>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locating}
                  className="text-sm bg-gray-100 px-3 py-1.5 rounded-md hover:bg-gray-200 text-gray-700 flex items-center gap-2 transition"
                >
                  {locating ? <Loader size={14} className="animate-spin" /> : '📍 Use Current Location'}
                </button>
              </div>

              {/* Saved Addresses Selector */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-2">Saved Addresses:</p>
                {savedAddresses.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {savedAddresses.map((addr) => (
                      <div
                        key={addr.id}
                        onClick={() => handleSelectAddress(addr)}
                        className={`p-3 border rounded-md cursor-pointer flex items-center justify-between transition-colors ${selectedAddressId === addr.id ? 'border-black bg-gray-50 ring-1 ring-black' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedAddressId === addr.id ? 'border-black' : 'border-gray-400'}`}>
                            {selectedAddressId === addr.id && <div className="w-2 h-2 rounded-full bg-black"></div>}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-bold text-gray-800">{addr.name}</span> - {addr.fullAddress}, {addr.city}
                          </div>
                        </div>
                        {addr.isDefault && <span className="text-[10px] bg-gray-200 px-2 py-0.5 rounded text-gray-600">Default</span>}
                      </div>
                    ))}
                    <div
                      onClick={() => { setSelectedAddressId(null); setFormData(prev => ({ ...prev, address: "", city: "", pincode: "" })); }}
                      className={`p-3 border rounded-md cursor-pointer flex items-center gap-3 text-sm ${selectedAddressId === null ? 'border-black bg-gray-50 ring-1 ring-black' : 'border-gray-200'}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedAddressId === null ? 'border-black' : 'border-gray-400'}`}>
                        {selectedAddressId === null && <div className="w-2 h-2 rounded-full bg-black"></div>}
                      </div>
                      <span>+ Add New Address</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No saved addresses found.</p>
                )}
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

              {/* Save Address Checkbox */}
              <div className="mt-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={saveAddress}
                    onChange={(e) => setSaveAddress(e.target.checked)}
                    className="rounded"
                  />
                  Save this address for future
                </label>
              </div>

              {/* Self Delivery Option */}
              {canSelfDeliver && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelfDelivery}
                      onChange={(e) => setIsSelfDelivery(e.target.checked)}
                      className="w-5 h-5 accent-green-600 rounded"
                    />
                    <span className="ml-3 font-medium text-green-800">
                      I will pick up the order myself (Self Delivery)
                    </span>
                  </label>
                  <p className="text-xs text-green-700 mt-1 ml-8">
                    Store Location: New Loah Mandi Road, Harmada (Within 15km of you)
                  </p>
                </div>
              )}

            </div>

            {/* Coupon Input */}
            <div className="flex gap-2 mb-4">
              <input
                placeholder="Promo Code"
                className="border p-2 rounded text-sm flex-1 uppercase"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={!!appliedCoupon}
              />
              {appliedCoupon ? (
                <button
                  type="button"
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
                  type="button"
                  onClick={handleApplyCoupon}
                  className="bg-gray-900 text-white px-4 rounded text-sm font-bold"
                >
                  Apply
                </button>
              )}
            </div>

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
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${paymentMethod === "COD"
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

                {/* Paytm Option */}
                <label
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${paymentMethod === "PAYTM"
                    ? "border-black bg-gray-50"
                    : "border-gray-200"
                    }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    className="w-5 h-5 accent-black"
                    checked={paymentMethod === "PAYTM"}
                    onChange={() => setPaymentMethod("PAYTM")}
                  />
                  <span className="ml-3 font-medium">Pay with Paytm</span>
                </label>

                {paymentMethod === "PAYTM" && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                    ✓ Secure payment via Paytm. You'll be redirected to Paytm's payment gateway.
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
              <div className="flex justify-between text-gray-600">
                <span>Delivery Charge</span>
                <span>₹{shippingChargeDisplay}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Offer For You</span>
                <span>-₹{shippingDiscount}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Coupon Discount</span>
                  <span>-₹{discount}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                <span>Total</span>
                <span>₹{finalTotal}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-black text-white h-12 rounded-lg font-bold hover:bg-gray-800 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Place Order (₹${finalTotal})`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
