
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Pool, Region } from '../types';
import { LocateFixed } from 'lucide-react';

function checkPoolAvailability(pool: Pool): boolean {
  const now = new Date();
  const day = now.getDay();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentTimeValue = currentHour * 60 + currentMin;

  const code = pool.closedDays || "";
  if (code.includes("매주 월요일") && day === 1) return false;
  if (code.includes("매주 일요일") && day === 0) return false;

  const isWeekend = (day === 0 || day === 6);
  
  const schedules = pool.freeSwimSchedule;
  const todaySchedules = schedules.filter(s => {
    if (day === 0 && s.day === "일요일") return true;
    if (day === 6 && s.day === "토요일") return true;
    if (day >= 1 && day <= 5 && s.day === "평일(월-금)") return true;
    if (isWeekend && s.day === "주말/공휴일") return true;
    return false;
  });

  if (todaySchedules.length === 0) return false;

  return todaySchedules.some(sch => {
    const [startH, startM] = sch.startTime.split(':').map(Number);
    const [endH, endM] = sch.endTime.split(':').map(Number);
    const startTimeValue = startH * 60 + startM;
    const endTimeValue = endH * 60 + endM;
    return currentTimeValue >= startTimeValue && currentTimeValue < endTimeValue;
  });
}

const KoreaMap: React.FC<KoreaMapProps> = ({ pools, onSelectPool, userLocation, selectedRegion, onRequestLocation }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [mapFilter, setMapFilter] = useState<'all' | 'available' | 'unavailable'>('all');

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [37.5665, 126.9780],
        zoom: 11,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
      }).addTo(mapInstanceRef.current);

      markersRef.current = L.layerGroup().addTo(mapInstanceRef.current);
      L.control.zoom({ position: 'bottomright' }).addTo(mapInstanceRef.current);
    }
  }, []);

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
      
      bounds.extend([userLocation.lat, userLocation.lng]);
    }

    pools.forEach(pool => {
      const isAvailable = checkPoolAvailability(pool);
      
      if (mapFilter === 'available' && !isAvailable) return;
      if (mapFilter === 'unavailable' && isAvailable) return;

      const statusText = isAvailable ? '수영 가능' : '종료/휴무';
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
    <div className="w-full h-full relative overflow-hidden">
      <div ref={mapRef} className="w-full h-full z-10" />
      
      <div className="absolute top-4 left-4 z-[400] bg-white/95 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-slate-200 flex flex-col gap-3 min-w-[160px]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full ring-4 ring-red-100"></div>
          <span className="text-xs font-bold text-slate-700">내 위치</span>
        </div>
        <div className="w-full h-px bg-slate-100"></div>
        <div className="space-y-2">
          <button 
            onClick={() => setMapFilter(prev => prev === 'available' ? 'all' : 'available')}
            className={`w-full flex items-center gap-2 p-2 rounded-xl transition-all ${mapFilter === 'available' ? 'bg-blue-50 border-blue-200 border ring-1 ring-blue-500' : 'hover:bg-slate-50 border border-transparent'}`}
          >
            <div className="w-6 h-3 bg-[#2563eb] rounded-full"></div>
            <span className={`text-xs font-bold ${mapFilter === 'available' ? 'text-blue-700' : 'text-slate-600'}`}>수영 가능</span>
          </button>
          <button 
            onClick={() => setMapFilter(prev => prev === 'unavailable' ? 'all' : 'unavailable')}
            className={`w-full flex items-center gap-2 p-2 rounded-xl transition-all ${mapFilter === 'unavailable' ? 'bg-slate-100 border-slate-300 border ring-1 ring-slate-400' : 'hover:bg-slate-50 border border-transparent'}`}
          >
            <div className="w-6 h-3 bg-[#64748b] rounded-full"></div>
            <span className={`text-xs font-bold ${mapFilter === 'unavailable' ? 'text-slate-700' : 'text-slate-600'}`}>종료/휴무</span>
          </button>
        </div>
      </div>

      <button 
        onClick={handleRecenter}
        className="absolute bottom-6 right-6 z-[400] bg-white p-3.5 rounded-2xl shadow-2xl border border-slate-200 hover:bg-slate-50 active:scale-90 transition-all text-red-600"
      >
        <LocateFixed size={24} strokeWidth={2.5} />
      </button>
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
