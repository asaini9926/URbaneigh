import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { Ticket, Plus, Trash2, X } from "lucide-react";

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    type: "PERCENTAGE", // or 'FIXED'
    value: "",
    minOrderVal: "0",
    expiryDate: "",
    usageLimit: "100",
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const res = await api.get("/coupons");
      setCoupons(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/coupons", newCoupon);
      alert("Coupon Created!");
      setShowForm(false);
      setNewCoupon({
        code: "",
        type: "PERCENTAGE",
        value: "",
        minOrderVal: "0",
        expiryDate: "",
        usageLimit: "100",
      });
      fetchCoupons();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to create coupon");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this coupon?")) return;
    try {
      await api.delete(`/coupons/${id}`);
      fetchCoupons();
    } catch (err) {
      alert("Delete failed");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Coupons & Offers</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-black text-white px-4 py-2 rounded flex items-center gap-2"
        >
          {showForm ? <X size={20} /> : <Plus size={20} />}{" "}
          {showForm ? "Close" : "Create Coupon"}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-100 p-6 rounded-lg mb-8 border border-gray-200">
          <h3 className="font-bold mb-4">Create New Coupon</h3>
          <form
            onSubmit={handleCreate}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
          >
            <div>
              <label className="text-xs font-bold text-gray-500">Code</label>
              <input
                required
                className="w-full p-2 rounded border uppercase font-bold"
                placeholder="e.g. SALE20"
                value={newCoupon.code}
                onChange={(e) =>
                  setNewCoupon({
                    ...newCoupon,
                    code: e.target.value.toUpperCase(),
                  })
                }
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">Type</label>
              <select
                className="w-full p-2 rounded border"
                value={newCoupon.type}
                onChange={(e) =>
                  setNewCoupon({ ...newCoupon, type: e.target.value })
                }
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">Value</label>
              <input
                required
                type="number"
                className="w-full p-2 rounded border"
                placeholder="e.g. 20"
                value={newCoupon.value}
                onChange={(e) =>
                  setNewCoupon({ ...newCoupon, value: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">
                Min Order Value
              </label>
              <input
                required
                type="number"
                className="w-full p-2 rounded border"
                value={newCoupon.minOrderVal}
                onChange={(e) =>
                  setNewCoupon({ ...newCoupon, minOrderVal: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">
                Usage Limit
              </label>
              <input
                required
                type="number"
                className="w-full p-2 rounded border"
                value={newCoupon.usageLimit}
                onChange={(e) =>
                  setNewCoupon({ ...newCoupon, usageLimit: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">
                Expiry Date
              </label>
              <input
                required
                type="date"
                className="w-full p-2 rounded border"
                value={newCoupon.expiryDate}
                onChange={(e) =>
                  setNewCoupon({ ...newCoupon, expiryDate: e.target.value })
                }
              />
            </div>
            <button
              type="submit"
              className="bg-green-600 text-white font-bold py-2 rounded mt-2 md:col-span-3"
            >
              Create Coupon
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map((coupon: any) => (
          <div
            key={coupon.id}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 relative overflow-hidden group"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-wider">
                  {coupon.code}
                </h3>
                <p className="text-sm font-medium text-green-600">
                  {coupon.type === "PERCENTAGE"
                    ? `${coupon.value}% OFF`
                    : `₹${coupon.value} OFF`}
                </p>
              </div>
              <div className="bg-gray-100 p-2 rounded-full">
                <Ticket size={20} className="text-gray-500" />
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500 space-y-1">
              <p>Min Order: ₹{coupon.minOrderVal}</p>
              <p>Expires: {new Date(coupon.expiryDate).toLocaleDateString()}</p>
              <p>
                Used: {coupon.usedCount} / {coupon.usageLimit}
              </p>
            </div>

            <button
              onClick={() => handleDelete(coupon.id)}
              className="absolute bottom-4 right-4 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminCoupons;
