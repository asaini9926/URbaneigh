import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { Upload, Trash2, Image as ImageIcon } from "lucide-react";

const AdminPosters = () => {
  const [posters, setPosters] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchPosters();
  }, []);

  const fetchPosters = async () => {
    const res = await api.get("/marketing/posters");
    setPosters(res.data);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, position: string, link: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      // 1. Upload Image
      const uploadRes = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // 2. Create Poster Record
      await api.post("/marketing/posters", {
        imageUrl: uploadRes.data.url,
        link: link,
        position: position,
      });

      fetchPosters();
    } catch (err) {
      alert("Failed to upload poster");
    } finally {
      setUploading(false);
      // Reset file input if needed, though hidden
      e.target.value = '';
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this poster?")) return;
    await api.delete(`/marketing/posters/${id}`);
    fetchPosters();
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Home Banners</h1>
        
        {/* Upload Form */}
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-end">
             <select 
                id="position-select"
                className="border border-gray-300 rounded px-3 py-2 text-sm"
             >
                <option value="home_main">Home Main</option>
                <option value="shop_top">Shop Top</option>
             </select>

             <input 
                id="link-input"
                type="text" 
                placeholder="/shop" 
                className="border border-gray-300 rounded px-3 py-2 text-sm w-full md:w-48"
             />

            <label className="bg-black text-white px-4 py-2 rounded flex items-center gap-2 cursor-pointer hover:bg-gray-800 whitespace-nowrap">
            <Upload size={20} />{" "}
            {uploading ? "Uploading..." : "Upload New Banner"}
            <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => {
                    const pos = (document.getElementById('position-select') as HTMLSelectElement).value;
                    const link = (document.getElementById('link-input') as HTMLInputElement).value || "/shop";
                    handleUpload(e, pos, link);
                }}
                disabled={uploading}
            />
            </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {posters.map((poster: any) => (
          <div
            key={poster.id}
            className="relative group rounded-lg overflow-hidden border border-gray-200"
          >
            <img src={poster.imageUrl} className="w-full h-48 object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <button
                onClick={() => handleDelete(poster.id)}
                className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
              >
                <Trash2 size={20} />
              </button>
            </div>
            {poster.isActive && (
              <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                Active
              </div>
            )}
          </div>
        ))}
        {posters.length === 0 && (
          <div className="text-gray-400 text-center py-10">
            No posters uploaded yet. Default image is being used.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPosters;
