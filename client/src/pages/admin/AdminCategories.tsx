import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { Plus, Trash2, FolderTree, X } from "lucide-react";

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [newCat, setNewCat] = useState({ name: "", slug: "", parentId: "" });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/master/categories");
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/master/categories", {
        ...newCat,
        parentId: newCat.parentId ? Number(newCat.parentId) : null,
      });
      alert("Category Created!");
      setNewCat({ name: "", slug: "", parentId: "" });
      setShowForm(false);
      fetchCategories();
    } catch (err: any) {
      alert("Failed to create. Slug might be duplicate.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      await api.delete(`/master/categories/${id}`);
      fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.error || "Delete failed");
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (val: string) => {
    setNewCat({
      ...newCat,
      name: val,
      slug: val
        .toLowerCase()
        .replace(/ /g, "-")
        .replace(/[^\w-]+/g, ""),
    });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-black text-white px-4 py-2 rounded flex items-center gap-2"
        >
          {showForm ? <X size={20} /> : <Plus size={20} />}{" "}
          {showForm ? "Close" : "Add Category"}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-100 p-6 rounded-lg mb-8 border border-gray-200">
          <h3 className="font-bold mb-4">Add New Category</h3>
          <form
            onSubmit={handleCreate}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
          >
            <div>
              <label className="text-xs font-bold text-gray-500">Name</label>
              <input
                required
                className="w-full p-2 rounded border"
                value={newCat.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">
                Slug (URL)
              </label>
              <input
                required
                className="w-full p-2 rounded border bg-gray-50"
                value={newCat.slug}
                onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">
                Parent (Optional)
              </label>
              <select
                className="w-full p-2 rounded border"
                value={newCat.parentId}
                onChange={(e) =>
                  setNewCat({ ...newCat, parentId: e.target.value })
                }
              >
                <option value="">None (Top Level)</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="bg-green-600 text-white font-bold py-2 rounded"
            >
              Create
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat: any) => (
          <div
            key={cat.id}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2 font-bold text-lg">
                <FolderTree size={20} className="text-gray-400" /> {cat.name}
              </div>
              <button
                onClick={() => handleDelete(cat.id)}
                className="text-red-400 hover:text-red-600"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3">/{cat.slug}</p>

            {/* Subcategories List */}
            {cat.children && cat.children.length > 0 && (
              <div className="pl-4 border-l-2 border-gray-100 space-y-1">
                {cat.children.map((child: any) => (
                  <div
                    key={child.id}
                    className="text-sm text-gray-600 flex justify-between group"
                  >
                    <span>- {child.name}</span>
                    <button
                      onClick={() => handleDelete(child.id)}
                      className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminCategories;
