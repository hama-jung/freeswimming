
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Pool, Region } from '../types';

interface KoreaMapProps {
  pools: Pool[];
  onSelectPool: (pool: Pool) => void;
  userLocation: { lat: number, lng: number } | null;
  selectedRegion: Region | "내주변";
  onRequestLocation: () => void;
}

function checkPoolAvailability(pool: Pool): boolean {
  const now = new Date();
  const day = now.getDay();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentTimeValue = currentHour * 60 + currentMin;

  const code = pool.closedDays || "";
  if (code.includes("매주 월요일") && day === 1) return false;
  if (code.includes("매주 일요일") && day === 0) return false;

  let todayDayType: any = "평일(월-금)";
  if (day === 0) todayDayType = "일요일";
  else if (day === 6) todayDayType = "토요일";

  const todaySchedules = pool.freeSwimSchedule.filter(sch => sch.day === todayDayType);
  if (todaySchedules.length === 0) return false;

  return todaySchedules.some(sch => {
    const [endH, endM] = sch.endTime.split(':').map(Number);
    const endTimeValue = endH * 60 + endM;
    return endTimeValue > currentTimeValue;
  });
}

const KoreaMap: React.FC<KoreaMapProps> = ({ pools, onSelectPool, userLocation, selectedRegion, onRequestLocation }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [mapFilter, setMapFilter] = useState<'all' | 'available' | 'unavailable'>('all');

  // 지도 초기화
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

  // 마커 업데이트 및 뷰 조절
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markerGroup = markersRef.current;
    if (!map || !markerGroup) return;

    markerGroup.clearLayers();
    const bounds = L.latLngBounds([]);

    // 1. 내 위치 마커 표시
    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      L.marker([userLocation.lat, userLocation.lng], { 
        icon: userIcon,
        zIndexOffset: 2000
      }).addTo(markerGroup);
      
      bounds.extend([userLocation.lat, userLocation.lng]);
    }

    // 2. 수영장 마커 표시 (지도 내부 필터 적용)
    pools.forEach(pool => {
      const isAvailable = checkPoolAvailability(pool);
      
      // 필터 조건 체크
      if (mapFilter === 'available' && !isAvailable) return;
      if (mapFilter === 'unavailable' && isAvailable) return;

      const statusText = isAvailable ? '수영 가능' : '종료/휴무';
      const statusClass = isAvailable ? 'pool-marker-available' : 'pool-marker-unavailable';

      const icon = L.divIcon({
        className: '',
        html: `<div class="pool-marker-bubble ${statusClass}">${statusText}</div>`,
        iconSize: [80, 32],
        iconAnchor: [40, 16]
      });

      L.marker([pool.lat, pool.lng], { icon })
        .on('click', () => onSelectPool(pool))
        .addTo(markerGroup);
      
      bounds.extend([pool.lat, pool.lng]);
    });

    // 3. 지도의 시점 조절 로직
    if (userLocation && selectedRegion === "내주변") {
        map.flyTo([userLocation.lat, userLocation.lng], 14, { duration: 1.5 });
    } else if (bounds.isValid() && pools.length > 0) {
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 });
    } else if (userLocation) {
        map.setView([userLocation.lat, userLocation.lng], 14);
    }
  }, [pools, userLocation, selectedRegion, mapFilter]);

  const handleRecenter = () => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 15, { duration: 1 });
    } else {
      onRequestLocation();
    }
  };

  const toggleFilter = (target: 'available' | 'unavailable') => {
    setMapFilter(prev => prev === target ? 'all' : target);
  };

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-inner border border-slate-200">
      <div ref={mapRef} className="w-full h-full z-10" />
      
      {/* 인터랙티브 범례 */}
      <div className="absolute top-6 left-6 z-[400] bg-white/95 backdrop-blur-xl p-5 rounded-2xl shadow-2xl border border-white flex flex-col gap-4 min-w-[180px]">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-red-600 rounded-full ring-4 ring-red-100"></div>
          <span className="text-sm font-black text-slate-700">현재 내 위치</span>
        </div>
        <div className="w-full h-px bg-slate-100"></div>
        <div className="space-y-3">
          <button 
            onClick={() => toggleFilter('available')}
            className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${mapFilter === 'available' ? 'bg-blue-50 ring-2 ring-blue-500 shadow-md' : 'hover:bg-slate-50'}`}
          >
            <div className={`w-8 h-4 bg-blue-600 rounded-full border border-white shadow-sm transition-transform ${mapFilter === 'available' ? 'scale-110' : ''}`}></div>
            <span className={`text-sm font-black ${mapFilter === 'available' ? 'text-blue-700' : 'text-slate-600'}`}>오늘 이용 가능</span>
          </button>
          <button 
            onClick={() => toggleFilter('unavailable')}
            className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${mapFilter === 'unavailable' ? 'bg-slate-100 ring-2 ring-slate-400 shadow-md' : 'hover:bg-slate-50'}`}
          >
            <div className={`w-8 h-4 bg-slate-600 rounded-full border border-white shadow-sm transition-transform ${mapFilter === 'unavailable' ? 'scale-110' : ''}`}></div>
            <span className={`text-sm font-black ${mapFilter === 'unavailable' ? 'text-slate-700' : 'text-slate-600'}`}>종료 또는 휴무</span>
          </button>
        </div>
        {mapFilter !== 'all' && (
          <button 
            onClick={() => setMapFilter('all')}
            className="text-[11px] font-bold text-blue-500 hover:underline text-center pt-1"
          >
            필터 해제 (전체 보기)
          </button>
        )}
      </div>

      {/* 내 위치 이동 버튼 */}
      <button 
        onClick={handleRecenter}
        className="absolute bottom-24 right-3 z-[400] bg-white p-3 rounded-xl shadow-xl border border-slate-200 hover:bg-slate-50 active:scale-90 transition-all text-red-600 group"
        title="내 위치로 이동"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
            <line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/>
            <line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>
        </svg>
      </button>

      {pools.length === 0 && !userLocation && (
        <div className="absolute inset-0 z-20 bg-slate-100/30 backdrop-blur-[2px] flex items-center justify-center p-6 text-center">
            <div className="bg-white/90 px-6 py-3 rounded-2xl shadow-lg border border-slate-100 animate-in zoom-in">
                <p className="text-slate-600 font-black text-sm">
                    현재 지역에 수영장 정보가 없습니다.
                </p>
            </div>
        </div>
      )}
    </div>
  );
};

export default KoreaMap;
