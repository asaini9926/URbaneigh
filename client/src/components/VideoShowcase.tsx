import { useRef, useEffect, useState } from 'react';
import { Play, Pause, ShoppingBag } from 'lucide-react';
import ProductCard from './ProductCard';

interface Video {
  id: number;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  products: any[];
}

const VideoShowcase = ({ videos }: { videos: Video[] }) => {
  const [playingId, setPlayingId] = useState<number | null>(null);
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement }>({});

  const togglePlay = (id: number) => {
    const vid = videoRefs.current[id];
    if (vid) {
      if (vid.paused) {
        // Pause others
        Object.values(videoRefs.current).forEach(v => {
            if (v !== vid) v.pause();
        });
        vid.play();
        setPlayingId(id);
      } else {
        vid.pause();
        setPlayingId(null);
      }
    }
  };

  if (!videos || videos.length === 0) return null;

  return (
    <div className="py-20 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-4xl font-bold mb-16 text-center tracking-tight">Shop The Look</h2>
        
        <div className="space-y-32">
            {videos.map((item, index) => (
                <div key={item.id} className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 items-center`}>
                    
                    {/* Video Section - 50% width */}
                    <div className="w-full lg:w-1/2">
                        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-black shadow-2xl group cursor-pointer transform hover:scale-[1.01] transition-all duration-500" onClick={() => togglePlay(item.id)}>
                            <video
                                ref={el => { if(el) videoRefs.current[item.id] = el }}
                                src={item.videoUrl}
                                poster={item.thumbnailUrl}
                                className="w-full h-full object-cover"
                                loop
                                playsInline
                                muted={false}
                            />
                            
                            {/* Overlay Play Button */}
                            <div className={`absolute inset-0 flex items-center justify-center bg-black/20 ${playingId === item.id ? 'opacity-0 hover:opacity-100' : 'opacity-100'} transition-opacity duration-300`}>
                                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/50 shadow-lg group-hover:scale-110 transition-transform">
                                    {playingId === item.id ? <Pause fill="currentColor" size={32} /> : <Play fill="currentColor" className="ml-1" size={32} />}
                                </div>
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent text-white">
                                <h3 className="font-bold text-2xl mb-2">{item.title}</h3>
                                <p className="text-white/80 text-sm">Click to play video</p>
                            </div>
                        </div>
                    </div>

                    {/* Products Grid - 50% width, matching visual weight */}
                    <div className="w-full lg:w-1/2">
                        <div className="flex items-center gap-2 mb-8 text-gray-900 border-b border-gray-200 pb-4">
                             <ShoppingBag size={24} />
                             <span className="font-bold uppercase tracking-widest text-sm">Featured in this look</span>
                        </div>
                        
                        {/* Grid optimized for 2 columns to match video height roughly */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-10">
                            {item.products.slice(0, 4).map(product => ( // Limit to 4 to prevent overflow
                                <ProductCard key={product.id} product={product} />
                            ))}
                            
                            {item.products.length === 0 && (
                                <div className="col-span-2 text-center py-10 text-gray-400">
                                    <p>No products linked to this video yet.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            ))}
        </div>

      </div>
    </div>
  );
};

export default VideoShowcase;
