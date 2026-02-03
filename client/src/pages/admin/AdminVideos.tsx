import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { Trash2, Video, Plus, X } from "lucide-react";

const AdminVideos = () => {
  const [videos, setVideos] = useState([]);
  const [products, setProducts] = useState<any[]>([]); // For linking
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [form, setForm] = useState({
      title: '',
      videoUrl: '',
      thumbnailUrl: '',
      productIds: [] as number[]
  });
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    fetchVideos();
    fetchProducts();
  }, []);

  const fetchVideos = async () => {
    const res = await api.get("/marketing/videos"); // Uses public endpoint, or I should make an admin one? Public one returns formatted data which is fine.
    setVideos(res.data);
  };

  const fetchProducts = async () => {
      // Need a lightweight product list
      const res = await api.get("/products?limit=1000"); // Get all for selection
      setProducts(res.data.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          await api.post("/marketing/videos", form);
          setForm({ title: '', videoUrl: '', thumbnailUrl: '', productIds: [] });
          setIsFormOpen(false);
          fetchVideos();
      } catch (err) {
          alert("Failed to create video");
      } finally {
          setLoading(false);
      }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this video?")) return;
    await api.delete(`/marketing/videos/${id}`);
    fetchVideos();
  };

  const toggleProduct = (id: number) => {
      setForm(prev => {
          if (prev.productIds.includes(id)) {
              return { ...prev, productIds: prev.productIds.filter(pid => pid !== id) };
          } else {
              if (prev.productIds.length >= 4) {
                  alert("Max 4 products per video recommended");
                  return prev;
              }
              return { ...prev, productIds: [...prev.productIds, id] };
          }
      });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shoppable Videos</h1>
        <button 
            onClick={() => setIsFormOpen(true)}
            className="bg-black text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-800"
        >
            <Plus size={20} /> Add New Video
        </button>
      </div>

      {/* CREATE FORM MODAL */}
      {isFormOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold">Add New Video</h2>
                      <button onClick={() => setIsFormOpen(false)}><X /></button>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium mb-1">Title</label>
                          <input 
                              type="text" 
                              required
                              className="w-full border rounded p-2"
                              value={form.title}
                              onChange={e => setForm({...form, title: e.target.value})}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Video URL (MP4)</label>
                            <input 
                                type="url" 
                                required
                                placeholder="https://..."
                                className="w-full border rounded p-2"
                                value={form.videoUrl}
                                onChange={e => setForm({...form, videoUrl: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Thumbnail URL</label>
                            <input 
                                type="url" 
                                required
                                placeholder="https://..."
                                className="w-full border rounded p-2"
                                value={form.thumbnailUrl}
                                onChange={e => setForm({...form, thumbnailUrl: e.target.value})}
                            />
                        </div>
                      </div>

                      {/* Product Selection */}
                      <div>
                          <label className="block text-sm font-medium mb-2">Link Products (Select up to 4)</label>
                          <div className="border rounded h-48 overflow-y-auto p-2 grid grid-cols-1 gap-2">
                              {products.map(p => (
                                  <div 
                                    key={p.id} 
                                    onClick={() => toggleProduct(p.id)}
                                    className={`flex items-center gap-3 p-2 rounded cursor-pointer border ${form.productIds.includes(p.id) ? 'border-black bg-gray-50' : 'border-transparent hover:bg-gray-50'}`}
                                  >
                                      <div className={`w-4 h-4 border rounded flex items-center justify-center ${form.productIds.includes(p.id) ? 'bg-black border-black' : 'border-gray-300'}`}>
                                          {form.productIds.includes(p.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                                      </div>
                                      <img src={p.variants[0]?.images[0]?.url} className="w-8 h-8 rounded object-cover" />
                                      <span className="text-sm truncate">{p.title}</span>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="flex justify-end gap-3 mt-6">
                          <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
                          <button type="submit" disabled={loading} className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">
                                {loading ? 'Saving...' : 'Save Video'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video: any) => (
          <div
            key={video.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="relative aspect-video">
                <img src={video.thumbnailUrl} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                     <Video className="text-white opacity-80" size={40} />
                </div>
            </div>
            
            <div className="p-4">
                <h3 className="font-bold text-lg mb-1">{video.title}</h3>
                <div className="text-sm text-gray-500 mb-4">{video.products?.length || 0} Products Linked</div>
                
                <div className="flex justify-end">
                    <button
                        onClick={() => handleDelete(video.id)}
                        className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
          </div>
        ))}
        {videos.length === 0 && (
          <div className="col-span-full text-center py-20 text-gray-400 bg-gray-50 rounded border-dashed border-2 border-gray-200">
            <Video size={48} className="mx-auto mb-4 opacity-50" />
            <p>No videos found. Create one to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminVideos;
