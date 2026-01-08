
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Waves, LocateFixed, CalendarCheck, Loader2, CheckCircle, MapPin, Info, Map as MapIcon, List as ListIcon, X, Plus, Calendar, Filter, EyeOff, ArrowLeft, Heart, AlertTriangle } from 'lucide-react';
import { Pool, Region } from './types';
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
  const schedules = pool.freeSwimSchedule || [];
  const possibleSchedules = schedules.filter(s => {
    if (day === 0 && (s.day === "일요일" || s.day === "주말/공휴일")) return true;
    if (day === 6 && (s.day === "토요일" || s.day === "주말/공휴일")) return true;
    if (day >= 1 && day <= 5 && s.day === "평일(월-금)") return true;
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
  const [view, setView] = useState<'list' | 'form' | 'private'>('list');
  const [displayMode, setDisplayMode] = useState<'map' | 'list'>('list');
  const [pools, setPools] = useState<Pool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPool, setEditingPool] = useState<Pool | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<{text: string, type: 'success'|'error'} | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region | "내주변">("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPoolDetail, setSelectedPoolDetail] = useState<Pool | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const stored = await getStoredPools();
      if (stored && stored.length > 0) {
        setPools(stored);
      } else {
        setPools(MOCK_POOLS);
      }
    } catch (e) {
      setPools(MOCK_POOLS);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (text: string, type: 'success'|'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 6000);
  };

  const handleUpdatePoolData = async (updatedPool: Pool) => {
    setIsLoading(true);
    try {
      const result = await savePool(updatedPool);
      if (result.success) {
        const freshList = await getStoredPools();
        setPools(freshList);
        const freshMatch = freshList.find(p => p.id === updatedPool.id);
        if (freshMatch) setSelectedPoolDetail({ ...freshMatch });
        showToast("정보가 성공적으로 반영되었습니다.", 'success');
      } else {
        // 백엔드(Supabase)에서 반환한 실제 에러 메시지를 보여줍니다.
        showToast(`저장 실패: ${result.error}`, 'error');
      }
    } catch (e: any) {
      showToast(`시스템 오류: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNearMe = () => {
    if (selectedRegion === "내주변") { setSelectedRegion("전체"); setUserLocation(null); return; }
    if (!navigator.geolocation) return alert("위치 정보를 지원하지 않는 브라우저입니다.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSelectedRegion("내주변");
        showToast("반경 5km 이내 수영장을 필터링합니다.");
      },
      () => alert("위치 권한을 허용해주세요.")
    );
  };

  const handleLogoClick = () => {
    setView('list'); setDisplayMode('list'); setSelectedRegion('전체'); setSearchQuery('');
    setShowAvailableOnly(false); setSelectedDate(todayStr); setSelectedPoolDetail(null);
  };

  const isTodaySelected = selectedDate === todayStr;

  const processedPools = useMemo(() => {
    const targetDateObj = new Date(selectedDate);
    const now = new Date();
    if (isTodaySelected) targetDateObj.setHours(now.getHours(), now.getMinutes());
    else targetDateObj.setHours(0, 0); 

    let list = pools.map(p => ({
      ...p,
      distance: userLocation ? calculateDistance(userLocation.lat, userLocation.lng, p.lat, p.lng) : undefined,
      isAvailable: isPoolAvailable(p, targetDateObj, isTodaySelected)
    }));

    if (view === 'private') list = list.filter(p => p.isPublic === false);
    else list = list.filter(p => p.isPublic !== false);

    if (view !== 'private') {
      if (selectedRegion === "내주변" && userLocation) {
        list = list.filter(p => p.distance !== undefined && p.distance <= 5);
        list.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      } else if (selectedRegion !== "전체" && selectedRegion !== "내주변") {
        list = list.filter(p => p.region === selectedRegion);
      }
      if (showAvailableOnly) list = list.filter(p => p.isAvailable);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q));
    }
    return list;
  }, [pools, userLocation, selectedRegion, showAvailableOnly, searchQuery, selectedDate, isTodaySelected, view]);

  if (view === 'form') {
    return (
      <PoolFormPage 
        initialData={editingPool} 
        onSave={async (p) => {
          setEditingPool(undefined);
          setView('list');
          await handleUpdatePoolData(p);
        }} 
        onCancel={() => { setView('list'); setEditingPool(undefined); }} 
      />
    );
  }

  return (
    <div className={`flex flex-col font-sans bg-[#f8fafc] ${displayMode === 'map' && view === 'list' ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
          <p className="font-bold text-slate-600">데이터를 동기화하고 있습니다...</p>
        </div>
      )}

      {toastMessage && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 transition-all ${toastMessage.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`}>
          {toastMessage.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-yellow-300" />}
          <div className="flex flex-col">
            <span className="text-sm font-black">{toastMessage.type === 'success' ? '성공' : '오류 발생'}</span>
            <span className="text-xs font-bold opacity-80">{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-white/50 hover:text-white"><X size={16} /></button>
        </div>
      )}

      {/* 헤더 및 나머지 UI 동일 (생략하지 않음) */}
      <header className="bg-white border-b border-slate-100 z-50 sticky top-0 shrink-0">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <button className="flex items-center gap-3 group cursor-pointer focus:outline-none" onClick={handleLogoClick}>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Waves size={24} strokeWidth={3} /></div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-900">자유수영.kr</h1>
          </button>
          <div className="flex items-center gap-2">
            {view === 'list' && (
              <div className="hidden sm:flex bg-slate-100 p-1.5 rounded-2xl mr-4">
                <button onClick={() => setDisplayMode('map')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black transition-all ${displayMode === 'map' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}><MapIcon size={18} /> 지도</button>
                <button onClick={() => setDisplayMode('list')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black transition-all ${displayMode === 'list' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}><ListIcon size={18} /> 목록</button>
              </div>
            )}
            <button onClick={() => setView('form')} className="bg-brand-600 text-white px-4 sm:px-6 h-10 sm:h-12 rounded-xl font-black text-xs sm:text-sm shadow-md active:scale-95 flex items-center gap-2 transition-all">
              <Plus size={18} strokeWidth={3} /> <span className="hidden sm:inline">수영장 등록</span><span className="sm:hidden">등록</span>
            </button>
          </div>
        </div>
      </header>

      <main className={`flex-1 relative ${displayMode === 'map' && view === 'list' ? 'overflow-hidden' : ''}`}>
        {displayMode === 'map' && view === 'list' ? (
          <div className="absolute inset-0">
            <KoreaMap pools={processedPools} onSelectPool={setSelectedPoolDetail} userLocation={userLocation} selectedRegion={selectedRegion} onRequestLocation={handleNearMe} />
          </div>
        ) : (
          <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
              {processedPools.map(p => <PoolCard key={p.id} pool={p} onClick={setSelectedPoolDetail} distance={p.distance} />)}
            </div>
            {processedPools.length === 0 && (
              <div className="py-24 sm:py-32 text-center flex flex-col items-center justify-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
                <Info size={40} className="text-slate-300 mb-6" />
                <h3 className="text-xl font-black text-slate-800 mb-2">검색 결과가 없습니다</h3>
                <p className="text-sm text-slate-400 font-bold">필터 설정을 변경해 보세요.</p>
              </div>
            )}
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
              const success = await deletePool(id); 
              await loadData(); 
              setSelectedPoolDetail(null); 
              if (success) showToast('정보가 삭제되었습니다.');
              else showToast('삭제 실패했습니다.', 'error');
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
