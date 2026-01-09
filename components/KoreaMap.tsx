
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Pool, Region } from '../types';
import { LocateFixed, Layers, Map as MapIcon } from 'lucide-react';

const KoreaMap: React.FC<KoreaMapProps> = ({ pools, onSelectPool, userLocation, selectedRegion, onRequestLocation }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [mapFilter, setMapFilter] = useState<'all' | 'available' | 'unavailable'>('all');

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initialCenter: L.LatLngExpression = userLocation ? [userLocation.lat, userLocation.lng] : [37.5665, 126.9780];

    mapInstanceRef.current = L.map(mapRef.current, {
      center: initialCenter,
      zoom: userLocation ? 14 : 11,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO'
    }).addTo(mapInstanceRef.current);

    markersRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    
    L.control.zoom({ position: 'topright' }).addTo(mapInstanceRef.current);

    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 100);
  }, []);

  // 데이터 변경 시 마커 및 시점 업데이트
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markerGroup = markersRef.current;
    if (!map || !markerGroup) return;

    markerGroup.clearLayers();
    const bounds = L.latLngBounds([]);

    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
      L.marker([userLocation.lat, userLocation.lng], { 
        icon: userIcon,
        zIndexOffset: 2000
      }).addTo(markerGroup);
      
      if (selectedRegion === "내주변") bounds.extend([userLocation.lat, userLocation.lng]);
    }

    pools.forEach(pool => {
      const isAvailable = (pool as any).isAvailable !== undefined ? (pool as any).isAvailable : true;
      
      if (mapFilter === 'available' && !isAvailable) return;
      if (mapFilter === 'unavailable' && isAvailable) return;

      const statusText = isAvailable ? '이용가능' : '이용불가';
      const statusClass = isAvailable ? 'pool-marker-available' : 'pool-marker-unavailable';

      const icon = L.divIcon({
        className: 'pool-marker-container',
        html: `<div class="pool-marker-bubble ${statusClass}">${statusText}</div>`,
        iconSize: [90, 36],
        iconAnchor: [45, 18]
      });

      L.marker([pool.lat, pool.lng], { icon })
        .on('click', () => onSelectPool(pool))
        .addTo(markerGroup);
      
      bounds.extend([pool.lat, pool.lng]);
    });

    if (userLocation && selectedRegion === "내주변") {
      map.flyTo([userLocation.lat, userLocation.lng], 14, { duration: 1.5 });
    } else if (bounds.isValid() && pools.length > 0) {
      // 모든 마커가 보이도록 패딩을 주고 줌을 맞춤
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  }, [pools, userLocation, selectedRegion, mapFilter]);

  const handleRecenter = () => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 15, { duration: 1 });
    } else {
      onRequestLocation();
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-50">
      <div ref={mapRef} className="w-full h-full" />
      
      <div className="absolute top-4 left-4 z-[500] bg-white/95 backdrop-blur-xl p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xl border border-slate-200 flex flex-col gap-2 sm:gap-3 min-w-[140px] sm:min-w-[160px] animate-in slide-in-from-left duration-300">
        <div className="flex items-center gap-2 text-slate-800">
          <Layers className="w-4 h-4 text-brand-500" />
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Map Filters</span>
        </div>
        <div className="w-full h-px bg-slate-100"></div>
        <div className="space-y-1.5 sm:space-y-2">
          <button 
            onClick={() => setMapFilter(prev => prev === 'available' ? 'all' : 'available')}
            className={`w-full flex items-center justify-between p-2 rounded-lg sm:p-2.5 sm:rounded-xl transition-all border ${mapFilter === 'available' ? 'bg-brand-50 border-brand-200 ring-1 ring-brand-500' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-brand-600 rounded-full shadow-sm"></div>
              <span className={`text-[11px] sm:text-xs font-bold ${mapFilter === 'available' ? 'text-brand-700' : 'text-slate-600'}`}>이용가능</span>
            </div>
          </button>
          <button 
            onClick={() => setMapFilter(prev => prev === 'unavailable' ? 'all' : 'unavailable')}
            className={`w-full flex items-center justify-between p-2 rounded-lg sm:p-2.5 sm:rounded-xl transition-all border ${mapFilter === 'unavailable' ? 'bg-slate-50 border-slate-300 ring-1 ring-slate-400' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-slate-500 rounded-full shadow-sm"></div>
              <span className={`text-[11px] sm:text-xs font-bold ${mapFilter === 'unavailable' ? 'text-brand-700' : 'text-slate-600'}`}>이용불가</span>
            </div>
          </button>
        </div>
      </div>

      <button 
        onClick={handleRecenter}
        className="absolute bottom-12 right-4 sm:bottom-10 sm:right-6 z-[500] bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 hover:bg-slate-50 active:scale-90 transition-all text-red-600 flex items-center justify-center"
      >
        <LocateFixed size={20} strokeWidth={2.5} />
      </button>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[9px] font-bold tracking-widest uppercase flex items-center gap-2 border border-white/10 shadow-2xl">
          <MapIcon size={12} className="text-brand-400" />
          Interactive Map
        </div>
      </div>
    </div>
  );
};

interface KoreaMapProps {
  pools: Pool[];
  onSelectPool: (pool: Pool) => void;
  userLocation: { lat: number, lng: number } | null;
  selectedRegion: Region | "내주변";
  onRequestLocation: () => void;
}

export default KoreaMap;
