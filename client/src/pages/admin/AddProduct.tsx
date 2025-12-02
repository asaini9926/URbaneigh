import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Trash,
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  X,
} from "lucide-react";

const AddProduct = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");

  // CHANGED: 'images' is now an array of strings
  const [variants, setVariants] = useState([
    {
      sku: "",
      color: "",
      size: "",
      price: "",
      stock: "",
      images: [] as string[],
    },
  ]);

  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [catRes, brandRes] = await Promise.all([
        api.get("/master/categories"),
        api.get("/master/brands"),
      ]);
      setCategories(catRes.data);
      setBrands(brandRes.data);
    };
    fetchData();
  }, []);

  const handleAddVariant = () => {
    setVariants([
      ...variants,
      { sku: "", color: "", size: "", price: "", stock: "", images: [] },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    const newVariants = [...variants];
    newVariants.splice(index, 1);
    setVariants(newVariants);
  };

  const handleVariantChange = (index: number, field: string, value: any) => {
    const newVariants = [...variants];
    // @ts-ignore
    newVariants[index][field] = value;
    setVariants(newVariants);
  };

  // --- NEW: Handle Multiple Image Upload ---
  const handleImageUpload = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingIndex(index);
    const formData = new FormData();

    // Append all selected files
    for (let i = 0; i < files.length; i++) {
      formData.append("images", files[i]);
    }

    try {
      const res = await api.post("/upload/multiple", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Append new URLs to existing images
      const currentImages = variants[index].images || [];
      handleVariantChange(index, "images", [
        ...currentImages,
        ...res.data.urls,
      ]);
    } catch (err) {
      alert("Image upload failed");
    } finally {
      setUploadingIndex(null);
    }
  };

  const removeImage = (variantIndex: number, imageIndex: number) => {
    const newVariants = [...variants];
    newVariants[variantIndex].images.splice(imageIndex, 1);
    setVariants(newVariants);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title,
        description,
        categoryId: Number(categoryId),
        brandId: Number(brandId),
        variants: variants.map((v) => ({
          ...v,
          price: Number(v.price),
          stock: Number(v.stock),
          sku:
            v.sku ||
            `${title.substring(0, 3).toUpperCase()}-${v.color
              .substring(0, 3)
              .toUpperCase()}-${v.size}`,
          // Send array of objects: [{ url: '...' }, { url: '...' }]
          images: v.images.map((url) => ({ url })),
        })),
      };

      await api.post("/products", payload);
      alert("Product Created Successfully!");
      navigate("/admin/products");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to create product");
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-500 hover:text-black mb-6"
      >
        <ArrowLeft size={20} className="mr-2" /> Back to Products
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">Add New Product</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
          <h2 className="text-lg font-bold border-b pb-2">Basic Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Product Title
              </label>
              <input
                required
                className="w-full border p-2 rounded"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                required
                rows={3}
                className="w-full border p-2 rounded"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                required
                className="w-full border p-2 rounded"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Select Category</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Brand</label>
              <select
                required
                className="w-full border p-2 rounded"
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
              >
                <option value="">Select Brand</option>
                {brands.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Variants Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-lg font-bold">
              Variants (Inventory & Gallery)
            </h2>
            <button
              type="button"
              onClick={handleAddVariant}
              className="text-sm bg-black text-white px-3 py-1 rounded flex items-center gap-1"
            >
              <Plus size={16} /> Add Variant
            </button>
          </div>

          {variants.map((variant, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start border bg-gray-50 p-4 rounded shadow-sm relative"
            >
              {/* Image Gallery Column */}
              <div className="md:col-span-4">
                <label className="text-xs font-bold text-gray-500 mb-2 block">
                  Product Images
                </label>

                {/* Image Grid */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {variant.images.map((img, imgIdx) => (
                    <div
                      key={imgIdx}
                      className="w-16 h-16 relative border border-gray-300 rounded overflow-hidden group"
                    >
                      <img src={img} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index, imgIdx)}
                        className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {/* Upload Button */}
                  <label className="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-black hover:bg-gray-100 transition-colors">
                    {uploadingIndex === index ? (
                      <div className="text-[10px]">...</div>
                    ) : (
                      <Upload size={20} className="text-gray-400" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple // Allow multiple selection
                      className="hidden"
                      onChange={(e) => handleImageUpload(index, e)}
                    />
                  </label>
                </div>
              </div>

              {/* Inputs */}
              <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500">
                    Color
                  </label>
                  <input
                    required
                    placeholder="e.g. Red"
                    className="w-full border p-2 rounded text-sm"
                    value={variant.color}
                    onChange={(e) =>
                      handleVariantChange(index, "color", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">
                    Size
                  </label>
                  <input
                    required
                    placeholder="e.g. M"
                    className="w-full border p-2 rounded text-sm"
                    value={variant.size}
                    onChange={(e) =>
                      handleVariantChange(index, "size", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">
                    Price (₹)
                  </label>
                  <input
                    required
                    type="number"
                    className="w-full border p-2 rounded text-sm"
                    value={variant.price}
                    onChange={(e) =>
                      handleVariantChange(index, "price", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">
                    Stock
                  </label>
                  <input
                    required
                    type="number"
                    className="w-full border p-2 rounded text-sm"
                    value={variant.stock}
                    onChange={(e) =>
                      handleVariantChange(index, "stock", e.target.value)
                    }
                  />
                </div>
                <div className="col-span-2 md:col-span-4 flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500">
                      SKU
                    </label>
                    <input
                      placeholder="Auto-generated"
                      className="w-full border p-2 rounded text-sm bg-white"
                      value={variant.sku}
                      onChange={(e) =>
                        handleVariantChange(index, "sku", e.target.value)
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(index)}
                    className="text-red-500 p-2 hover:bg-red-100 rounded border border-transparent hover:border-red-200"
                  >
                    <Trash size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="w-full bg-black text-white py-4 rounded-lg font-bold text-lg hover:bg-gray-800 transition-all"
        >
          Publish Product
        </button>
      </form>
    </div>
  );
};

export default AddProduct;
