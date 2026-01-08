import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Pool, Region } from '../types';
// Import Map and alias it as MapIcon to fix the "Cannot find name 'MapIcon'" error.
import { LocateFixed, Layers, Map as MapIcon } from 'lucide-react';

const KoreaMap: React.FC<KoreaMapProps> = ({ pools, onSelectPool, userLocation, selectedRegion, onRequestLocation }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [mapFilter, setMapFilter] = useState<'all' | 'available' | 'unavailable'>('all');

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = L.map(mapRef.current, {
      center: [37.5665, 126.9780],
      zoom: 11,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO'
    }).addTo(mapInstanceRef.current);

    markersRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    
    // 줌 컨트롤 위치 조정 (모바일에서 버튼과 겹치지 않게 상단 우측으로 이동)
    L.control.zoom({ position: 'topright' }).addTo(mapInstanceRef.current);

    // 지도가 렌더링된 후 크기 재계산 (레이아웃 깨짐 방지 핵심)
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 100);
  }, []);

  // 수영장 데이터 및 위치 업데이트에 따른 마커 렌더링
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markerGroup = markersRef.current;
    if (!map || !markerGroup) return;

    markerGroup.clearLayers();
    const bounds = L.latLngBounds([]);

    // 사용자 위치 마커
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
      
      bounds.extend([userLocation.lat, userLocation.lng]);
    }

    // 수영장 마커 표시
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

    // 지도 시점 조절
    if (userLocation && selectedRegion === "내주변") {
        map.flyTo([userLocation.lat, userLocation.lng], 14, { duration: 1.5 });
    } else if (bounds.isValid() && pools.length > 0) {
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 });
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
      {/* 맵 컨테이너: z-index를 제거하여 Leaflet 내부 레이어와 충돌 방지 */}
      <div ref={mapRef} className="w-full h-full" />
      
      {/* 지도 필터 UI: z-index를 높여 최상단에 고정 */}
      <div className="absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-slate-200 flex flex-col gap-3 min-w-[160px] animate-in slide-in-from-left duration-300">
        <div className="flex items-center gap-2 text-slate-800">
          <Layers className="w-4 h-4 text-brand-500" />
          <span className="text-xs font-bold uppercase tracking-wider">Map Filters</span>
        </div>
        <div className="w-full h-px bg-slate-100"></div>
        <div className="space-y-2">
          <button 
            onClick={() => setMapFilter(prev => prev === 'available' ? 'all' : 'available')}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all border ${mapFilter === 'available' ? 'bg-brand-50 border-brand-200 ring-1 ring-brand-500' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-brand-600 rounded-full shadow-sm shadow-brand-200"></div>
              <span className={`text-xs font-bold ${mapFilter === 'available' ? 'text-brand-700' : 'text-slate-600'}`}>이용가능</span>
            </div>
            {mapFilter === 'available' && <div className="w-1.5 h-1.5 bg-brand-600 rounded-full"></div>}
          </button>
          <button 
            onClick={() => setMapFilter(prev => prev === 'unavailable' ? 'all' : 'unavailable')}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all border ${mapFilter === 'unavailable' ? 'bg-slate-50 border-slate-300 ring-1 ring-slate-400' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-slate-500 rounded-full shadow-sm shadow-slate-200"></div>
              <span className={`text-xs font-bold ${mapFilter === 'unavailable' ? 'text-slate-700' : 'text-slate-600'}`}>이용불가</span>
            </div>
            {mapFilter === 'unavailable' && <div className="w-1.5 h-1.5 bg-slate-500 rounded-full"></div>}
          </button>
        </div>
      </div>

      {/* 내 위치 버튼: 줌 컨트롤과 겹치지 않게 적절한 위치 확보 */}
      <button 
        onClick={handleRecenter}
        className="absolute bottom-10 right-6 z-[1000] bg-white p-4 rounded-2xl shadow-2xl border border-slate-200 hover:bg-slate-50 active:scale-90 transition-all text-red-600 flex items-center justify-center group"
      >
        <LocateFixed size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
      </button>

      {/* 지도 가이드 라벨 */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 border border-white/10 shadow-2xl">
          <MapIcon size={12} className="text-brand-400" />
          Interactive Pool Map
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