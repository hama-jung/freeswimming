
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Map as MapIcon, List, Waves, LocateFixed, CalendarCheck, PlusCircle, ArrowLeft, Database, UserCheck, Trash2, Loader2, CheckCircle, Info, X as CloseIcon, Github, Mail, Download, Upload, AlertTriangle, Cloud } from 'lucide-react';
import { Pool, Region } from './types';
import { MOCK_POOLS, REGIONS } from './constants';
import PoolCard from './components/PoolCard';
import PoolDetail from './components/PoolDetail';
import KoreaMap from './components/KoreaMap';
import PoolFormPage from './components/PoolFormPage';
import { getStoredPools, savePool, deletePool } from './services/storageService';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isPoolAvailableToday(pool: Pool): boolean {
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

function App() {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [pools, setPools] = useState<Pool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPool, setEditingPool] = useState<Pool | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [selectedRegion, setSelectedRegion] = useState<Region | "내주변">("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPoolDetail, setSelectedPoolDetail] = useState<Pool | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    const stored = await getStoredPools();
    if (stored.length > 0) {
      setPools(stored);
    } else {
      // 데이터가 아예 없으면 초기 샘플을 DB에 업로드
      setPools(MOCK_POOLS);
      for (const p of MOCK_POOLS) {
        await savePool(p);
      }
    }
    setIsLoading(false);
  };

  const handleSavePool = async (pool: Pool) => {
    setIsLoading(true);
    const success = await savePool(pool);
    if (success) {
      const updated = await getStoredPools();
      setPools(updated);
      if (selectedPoolDetail?.id === pool.id) {
        setSelectedPoolDetail(pool);
      }
      setView('list');
      setEditingPool(undefined);
      showToast("데이터가 클라우드에 실시간 저장되었습니다!");
    } else {
      alert("데이터베이스 연결에 실패했습니다.");
    }
    setIsLoading(false);
  };

  const handleDeletePool = async (poolId: string) => {
    if (window.confirm("이 정보는 모든 사용자에게서 삭제됩니다. 삭제하시겠습니까?")) {
      setIsLoading(true);
      const success = await deletePool(poolId);
      if (success) {
        const updated = await getStoredPools();
        setPools(updated);
        setSelectedPoolDetail(null);
        showToast("정보가 삭제되었습니다.");
      }
      setIsLoading(false);
    }
  };

  const handleNearMe = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setSelectedRegion("내주변");
        setIsLocating(false);
        showToast("내 주변 수영장을 찾았습니다.");
      },
      () => {
        alert("위치 정보를 가져올 수 없습니다.");
        setIsLocating(false);
      }
    );
  };

  const mapData = useMemo(() => {
    return pools.map(p => ({
      ...p,
      distance: userLocation ? calculateDistance(userLocation.lat, userLocation.lng, p.lat, p.lng) : undefined
    }));
  }, [pools, userLocation]);

  let filteredList = mapData;

  if (selectedRegion === "내주변" && userLocation) {
    filteredList = filteredList.filter(p => p.distance !== undefined && p.distance <= 10);
    filteredList.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  } else if (selectedRegion !== "전체") {
    filteredList = filteredList.filter(p => p.region === selectedRegion);
  }

  if (showAvailableOnly) {
    filteredList = filteredList.filter(p => isPoolAvailableToday(p));
  }

  if (searchQuery) {
    filteredList = filteredList.filter(p => p.name.includes(searchQuery) || p.address.includes(searchQuery));
  }

  if (view === 'form') {
    return <PoolFormPage initialData={editingPool} onSave={handleSavePool} onCancel={() => { setView('list'); setEditingPool(undefined); }} />;
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="font-black text-slate-700">전국 실시간 데이터를 동기화 중...</p>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="font-bold">{toastMessage}</span>
        </div>
      )}

      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 h-20 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Waves className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter">자유수영.kr</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl text-blue-600 border border-blue-100">
            <Cloud className="w-4 h-4" />
            <span className="text-xs font-black">실시간 클라우드 모드</span>
          </div>
          <button onClick={() => setView('form')} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-blue-700 transition-all flex items-center gap-2">
            <PlusCircle className="w-5 h-5" />
            <span>수영장 추가</span>
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto w-full px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="전국 수영장 검색 (이름, 주소)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-5 bg-slate-100 rounded-[2rem] text-xl font-bold focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all"
            />
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAvailableOnly(!showAvailableOnly)} className={`px-8 rounded-2xl font-black flex items-center gap-2 border-2 transition-all ${showAvailableOnly ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>
              <CalendarCheck className="w-5 h-5" /> 오늘 가능
            </button>
            <button onClick={handleNearMe} className="px-8 bg-slate-100 rounded-2xl font-black flex items-center gap-2 text-slate-600 hover:bg-slate-200 transition-all">
              <LocateFixed className="w-5 h-5" /> 내 주변
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-6">
          {REGIONS.map(r => (
            <button key={r} onClick={() => setSelectedRegion(r)} className={`whitespace-nowrap px-6 py-2.5 rounded-full font-black border-2 transition-all ${selectedRegion === r ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-500 hover:border-blue-300'}`}>
              {r}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 py-10">
          {filteredList.map(p => (
            <PoolCard key={p.id} pool={p} onClick={setSelectedPoolDetail} distance={p.distance} />
          ))}
        </div>
        
        {filteredList.length === 0 && (
          <div className="text-center py-40 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-100">
            <Waves className="w-20 h-20 text-slate-200 mx-auto mb-6" />
            <p className="text-xl font-black text-slate-400">검색 결과가 없습니다.</p>
          </div>
        )}
      </div>

      <footer className="bg-slate-50 border-t border-slate-100 py-12 px-6 mt-auto">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <p className="text-slate-400 font-bold">© 2024 자유수영.kr - 실시간 클라우드 정보 공유 서비스</p>
          <div className="flex gap-6">
            <Mail className="w-5 h-5 text-slate-300" />
            <Github className="w-5 h-5 text-slate-300" />
          </div>
        </div>
      </footer>

      {selectedPoolDetail && (
        <PoolDetail 
          pool={selectedPoolDetail} 
          onClose={() => setSelectedPoolDetail(null)} 
          onUpdatePool={handleSavePool}
          onEditRequest={(p) => { setEditingPool(p); setView('form'); setSelectedPoolDetail(null); }}
          onDeleteRequest={handleDeletePool}
          isUserCreated={true}
          user={null}
          onLoginRequest={() => {}} 
        />
      )}
    </div>
  );
}

export default App;
