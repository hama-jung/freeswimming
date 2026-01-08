
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Waves, LocateFixed, CalendarCheck, PlusCircle, Loader2, CheckCircle, MapPin, Info, Map as MapIcon, List as ListIcon, SlidersHorizontal, X, ChevronRight, Plus, Calendar, RotateCcw, EyeOff, Eye } from 'lucide-react';
import { Pool, Region, DayType } from './types';
import { MOCK_POOLS, REGIONS } from './constants';
import PoolCard from './components/PoolCard';
import PoolDetail from './components/PoolDetail';
import PoolFormPage from './components/PoolFormPage';
import KoreaMap from './components/KoreaMap';
import { getStoredPools, savePool, deletePool } from './services/storageService';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isPoolAvailable(pool: Pool, targetDate: Date, checkRealtime: boolean = false): boolean {
  const day = targetDate.getDay();
  const currentMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();

  const closed = pool.closedDays || "";
  if (closed.includes("매주 월요일") && day === 1) return false;
  if (closed.includes("매주 일요일") && day === 0) return false;
  
  const schedules = pool.freeSwimSchedule;
  
  const possibleSchedules = schedules.filter(s => {
    if (day === 0 && (s.day === "일요일" || s.day === "주말/공휴일")) return true;
    if (day === 6 && (s.day === "토요일" || s.day === "주말/공휴일")) return true;
    if (day >= 1 && day <= 5 && s.day === "평일(월-금)") return true;
    if ((s.day as any) === "전체") return true;
    return false;
  });

  if (possibleSchedules.length === 0) return false;

  if (checkRealtime) {
    return possibleSchedules.some(s => {
      const [endH, endM] = s.endTime.split(':').map(Number);
      const endMin = endH * 60 + endM;
      return currentMinutes < endMin;
    });
  }

  return true;
}

function App() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [view, setView] = useState<'list' | 'form'>('list');
  const [displayMode, setDisplayMode] = useState<'map' | 'list'>('list');
  const [pools, setPools] = useState<Pool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPool, setEditingPool] = useState<Pool | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const [selectedRegion, setSelectedRegion] = useState<Region | "내주변">("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPoolDetail, setSelectedPoolDetail] = useState<Pool | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [showHiddenPools, setShowHiddenPools] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const stored = await getStoredPools();
      if (stored.length > 0) {
        setPools(stored);
      } else {
        setPools(MOCK_POOLS);
        for (const p of MOCK_POOLS) await savePool(p);
      }
    } catch (e) {
      console.error("Data load failed:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleNearMe = () => {
    if (!navigator.geolocation) return alert("위치 정보를 지원하지 않는 브라우저입니다.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSelectedRegion("내주변");
        showToast("가까운 수영장을 찾고 지도를 이동합니다.");
        setDisplayMode('map');
      },
      () => alert("위치 권한을 허용해주세요.")
    );
  };

  const resetDate = () => {
    setSelectedDate(todayStr);
    setShowAvailableOnly(false);
  };

  const isTodaySelected = selectedDate === todayStr;

  const processedPools = useMemo(() => {
    const targetDateObj = new Date(selectedDate);
    const now = new Date();
    
    if (isTodaySelected) {
      targetDateObj.setHours(now.getHours(), now.getMinutes());
    } else {
      targetDateObj.setHours(0, 0); 
    }

    let list = pools.map(p => ({
      ...p,
      distance: userLocation ? calculateDistance(userLocation.lat, userLocation.lng, p.lat, p.lng) : undefined,
      isAvailable: isPoolAvailable(p, targetDateObj, isTodaySelected && showAvailableOnly)
    }));

    if (!showHiddenPools) {
      list = list.filter(p => p.isPublic !== false);
    }

    if (selectedRegion === "내주변" && userLocation) {
      list = list.filter(p => p.distance !== undefined && p.distance <= 15);
      list.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else if (selectedRegion !== "전체") {
      list = list.filter(p => p.region === selectedRegion);
    }

    list = list.filter(p => isPoolAvailable(p, targetDateObj, false));

    if (isTodaySelected && showAvailableOnly) {
      list = list.filter(p => p.isAvailable);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q));
    }

    return list;
  }, [pools, userLocation, selectedRegion, showAvailableOnly, searchQuery, selectedDate, isTodaySelected, showHiddenPools]);

  // 통합된 정보 갱신 함수 (수정 및 복구 공통 사용)
  const handleUpdatePoolData = async (updatedPool: Pool) => {
    setIsLoading(true);
    const success = await savePool(updatedPool);
    if (success) {
      // 1. 데이터 리로드
      const stored = await getStoredPools();
      setPools(stored);
      
      // 2. 현재 열린 상세 모달 데이터 즉시 갱신 (참조를 새로 만들어야 리액트가 감지함)
      const freshMatch = stored.find(p => p.id === updatedPool.id);
      if (freshMatch) {
        setSelectedPoolDetail({ ...freshMatch });
      } else {
        setSelectedPoolDetail({ ...updatedPool });
      }
      
      showToast("정보가 저장되었습니다.");
    } else {
      alert("데이터 저장 중 오류가 발생했습니다.");
    }
    setIsLoading(false);
  };

  if (view === 'form') {
    return (
      <PoolFormPage 
        initialData={editingPool} 
        onSave={async (p) => {
          setView('list');
          setEditingPool(undefined);
          await handleUpdatePoolData(p);
        }} 
        onCancel={() => { 
          setView('list'); 
          setEditingPool(undefined); 
        }} 
      />
    );
  }

  return (
    <div className={`flex flex-col font-sans bg-[#f8fafc] ${displayMode === 'map' ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
          <p className="font-bold text-slate-600">처리 중...</p>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-4">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      <div className="sm:hidden flex items-center justify-between px-5 py-4 bg-white border-b border-slate-50 shrink-0 z-40">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
          <Waves className="text-brand-600 w-6 h-6" strokeWidth={3} />
          <h1 className="text-xl font-black tracking-tight text-slate-900">자유수영.kr</h1>
        </div>
        <button 
          onClick={() => setView('form')}
          className="flex items-center gap-1.5 bg-brand-600 text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-md active:scale-95"
        >
          <Plus size={16} strokeWidth={3} /> 기록하기
        </button>
      </div>

      <div className="sm:hidden flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-100 z-30 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setShowAvailableOnly(!showAvailableOnly)} 
          disabled={!isTodaySelected}
          className={`flex-1 h-11 min-w-[100px] rounded-xl font-black text-xs flex items-center justify-center gap-1 transition-all border-2 shadow-sm ${!isTodaySelected ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' : (showAvailableOnly ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-100 text-slate-700')}`}
        >
          <CalendarCheck size={16} /> 이용가능만
        </button>
        <button onClick={handleNearMe} className="flex-1 h-11 min-w-[80px] bg-white border-2 border-slate-100 rounded-xl font-black text-xs text-slate-700 flex items-center justify-center gap-1 active:scale-95 shadow-sm">
          <LocateFixed size={16} className="text-brand-500" /> 내주변
        </button>
        <button onClick={() => setIsFilterOpen(true)} className="w-11 h-11 bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center border border-slate-200 active:scale-90 transition-all shrink-0 relative">
          <SlidersHorizontal size={18} />
          {showHiddenPools && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>}
        </button>
      </div>

      <header className="hidden sm:flex h-24 px-6 glass border-b border-slate-200 shrink-0 z-40 justify-center">
        <div className="w-full max-w-[1280px] flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-200">
              <Waves size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">자유수영.kr</h1>
              {showHiddenPools && <p className="text-[10px] text-red-500 font-bold tracking-widest mt-0.5">ADMIN MODE</p>}
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-2xl">
            <button 
              onClick={() => setDisplayMode('map')}
              className={`flex items-center gap-2 px-10 py-3 rounded-xl text-base font-black transition-all ${displayMode === 'map' ? 'bg-white shadow-md text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <MapIcon size={22} /> 지도
            </button>
            <button 
              onClick={() => setDisplayMode('list')}
              className={`flex items-center gap-2 px-10 py-3 rounded-xl text-base font-black transition-all ${displayMode === 'list' ? 'bg-white shadow-md text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ListIcon size={22} /> 목록
            </button>
          </div>

          <button onClick={() => setView('form')} className="bg-brand-600 text-white h-14 px-8 rounded-2xl font-black text-lg hover:bg-brand-700 transition-all flex items-center gap-2 shadow-lg active:scale-95">
            <PlusCircle size={24} />
            <span>수영장 등록</span>
          </button>
        </div>
      </header>

      <main className={`flex-1 relative ${displayMode === 'map' ? 'overflow-hidden' : ''}`}>
        {displayMode === 'map' ? (
          <div className="absolute inset-0">
            <KoreaMap pools={processedPools} onSelectPool={setSelectedPoolDetail} userLocation={userLocation} selectedRegion={selectedRegion} onRequestLocation={handleNearMe} />
          </div>
        ) : (
          <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
              {processedPools.map(p => (
                <PoolCard key={p.id} pool={p} onClick={setSelectedPoolDetail} distance={p.distance} />
              ))}
            </div>
            {processedPools.length === 0 && (
              <div className="py-24 sm:py-32 text-center flex flex-col items-center justify-center">
                <Info size={48} className="text-slate-200 mb-4" />
                <h3 className="text-xl font-black text-slate-400 mb-1">조건에 맞는 수영장이 없습니다</h3>
                <p className="text-sm text-slate-400 font-bold">요일별 운영 정보를 다시 확인해 보세요.</p>
              </div>
            )}
            <div className="h-20 sm:hidden"></div>
          </div>
        )}
      </main>

      {selectedPoolDetail && (
        <PoolDetail 
          pool={selectedPoolDetail} 
          onClose={() => setSelectedPoolDetail(null)} 
          onUpdatePool={handleUpdatePoolData}
          onEditRequest={(p) => { setEditingPool(p); setView('form'); setSelectedPoolDetail(null); }}
          onDeleteRequest={async (id) => { 
            if(confirm('이 수영장 정보를 삭제할까요?')) {
              setIsLoading(true);
              await deletePool(id); 
              await loadData(); 
              setSelectedPoolDetail(null); 
              showToast('정보가 삭제되었습니다.');
              setIsLoading(false);
            }
          }}
          user={null}
          onLoginRequest={() => {}} 
        />
      )}
    </div>
  );
}

export default App;
