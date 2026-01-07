
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Waves, LocateFixed, CalendarCheck, PlusCircle, Loader2, CheckCircle, MapPin, Info, Map as MapIcon, List as ListIcon, SlidersHorizontal, X, ChevronRight, Plus, Calendar, RotateCcw } from 'lucide-react';
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

/**
 * 특정 날짜 및 시간에 수영장이 이용 가능한지 확인
 */
function isPoolAvailable(pool: Pool, targetDate: Date, checkRealtime: boolean = false): boolean {
  const day = targetDate.getDay(); // 0: 일, 1: 월 ... 6: 토
  const currentMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();

  // 휴무일 체크
  const closed = pool.closedDays || "";
  if (closed.includes("매주 월요일") && day === 1) return false;
  if (closed.includes("매주 일요일") && day === 0) return false;
  
  const schedules = pool.freeSwimSchedule;
  
  // 해당 요일에 해당하는 스케줄 필터링
  const possibleSchedules = schedules.filter(s => {
    if (day === 0 && (s.day === "일요일" || s.day === "주말/공휴일")) return true;
    if (day === 6 && (s.day === "토요일" || s.day === "주말/공휴일")) return true;
    if (day >= 1 && day <= 5 && s.day === "평일(월-금)") return true;
    if ((s.day as any) === "전체") return true;
    return false;
  });

  if (possibleSchedules.length === 0) return false;

  // 실시간 이용가능 체크 (오늘 날짜이면서 버튼이 켜진 경우)
  if (checkRealtime) {
    return possibleSchedules.some(s => {
      const [endH, endM] = s.endTime.split(':').map(Number);
      const endMin = endH * 60 + endM;
      // 현재 시간 이전에 끝나는 타임은 제외 (현재 시간 이후에 종료되는 스케줄이 하나라도 있으면 true)
      return currentMinutes < endMin;
    });
  }

  // 단순 날짜 필터링인 경우 요일 스케줄만 있으면 true
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const stored = await getStoredPools();
    if (stored.length > 0) {
      setPools(stored);
    } else {
      setPools(MOCK_POOLS);
      for (const p of MOCK_POOLS) await savePool(p);
    }
    setIsLoading(false);
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

    if (selectedRegion === "내주변" && userLocation) {
      list = list.filter(p => p.distance !== undefined && p.distance <= 15);
      list.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else if (selectedRegion !== "전체") {
      list = list.filter(p => p.region === selectedRegion);
    }

    // 1. 날짜(요일) 기반 필터링: 선택한 요일에 운영하지 않는 곳은 모두 제외
    list = list.filter(p => isPoolAvailable(p, targetDateObj, false));

    // 2. '이용가능만' (오늘 한정 현재 시간 이후 스케줄 존재 여부) 필터 적용
    if (isTodaySelected && showAvailableOnly) {
      list = list.filter(p => p.isAvailable);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q));
    }

    return list;
  }, [pools, userLocation, selectedRegion, showAvailableOnly, searchQuery, selectedDate, isTodaySelected]);

  if (view === 'form') {
    return <PoolFormPage initialData={editingPool} onSave={async (p) => {
      setIsLoading(true);
      await savePool(p);
      await loadData();
      setView('list');
      setEditingPool(undefined);
      showToast("정보가 업데이트되었습니다.");
    }} onCancel={() => { setView('list'); setEditingPool(undefined); }} />;
  }

  return (
    <div className={`flex flex-col font-sans bg-[#f8fafc] ${displayMode === 'map' ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      {isLoading && (
        <div className="fixed inset-0 z-[100] glass flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
          <p className="font-bold text-slate-600">수영장 데이터 동기화 중...</p>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-4">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Mobile Top Header */}
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

      {/* Mobile Quick Action Buttons */}
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
        <button onClick={() => setIsFilterOpen(true)} className="w-11 h-11 bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center border border-slate-200 active:scale-90 transition-all shrink-0">
          <SlidersHorizontal size={18} />
        </button>
      </div>

      {/* Desktop Header */}
      <header className="hidden sm:flex h-24 px-6 glass border-b border-slate-200 shrink-0 z-40 justify-center">
        <div className="w-full max-w-[1280px] flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-200">
              <Waves size={32} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">자유수영.kr</h1>
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

      {/* Desktop Search & Filter Section */}
      <div className="hidden sm:flex bg-white border-b border-slate-100 z-30 shrink-0 flex-col items-center">
        <div className="w-full max-w-[1280px] px-6 py-10 flex flex-col gap-8">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="수영장 이름이나 주소 검색" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-16 pl-16 pr-6 bg-slate-100 border-2 border-transparent focus:border-brand-500 focus:bg-white rounded-2xl text-xl font-bold outline-none transition-all placeholder:text-slate-400"
              />
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
            </div>
            
            <div className="relative flex items-center">
               <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500 pointer-events-none z-10">
                  <Calendar size={20} />
               </div>
               <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); if(e.target.value !== todayStr) setShowAvailableOnly(false); }}
                className="h-16 pl-12 pr-12 bg-slate-100 border-2 border-transparent focus:border-brand-500 focus:bg-white rounded-2xl font-bold outline-none text-slate-700 cursor-pointer transition-all"
               />
               {!isTodaySelected && (
                 <button 
                  onClick={resetDate}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-white/50 rounded-full p-1 transition-all"
                  title="오늘로 초기화"
                 >
                   <X size={16} strokeWidth={3} />
                 </button>
               )}
            </div>

            <button 
              onClick={() => setShowAvailableOnly(!showAvailableOnly)} 
              disabled={!isTodaySelected}
              className={`h-16 px-8 rounded-2xl font-black flex items-center gap-2 transition-all border-2 shadow-sm ${!isTodaySelected ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' : (showAvailableOnly ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-500')}`}
            >
              <CalendarCheck size={20} /> {isTodaySelected ? '이용가능만' : '운영일만'}
            </button>

            <button onClick={handleNearMe} className="h-16 px-8 bg-white border-2 border-slate-200 rounded-2xl font-black text-slate-700 flex items-center gap-2 hover:border-brand-500 hover:text-brand-600 transition-all shadow-sm">
              <LocateFixed size={20} className="text-brand-500" /> 내주변
            </button>
          </div>

          <div className="flex w-full overflow-x-auto gap-3 pb-2 justify-start scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {REGIONS.map(r => (
              <button 
                key={r} 
                onClick={() => setSelectedRegion(r)}
                className={`h-12 px-8 shrink-0 rounded-xl font-black text-base transition-all border-2 whitespace-nowrap ${selectedRegion === r ? 'bg-brand-600 border-brand-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Sidebar (Mobile Only) */}
      {isFilterOpen && (
        <div className="sm:hidden fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setIsFilterOpen(false)}></div>
          <div className="relative w-[85%] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">상세 검색</h3>
              <button onClick={() => setIsFilterOpen(false)} className="p-2 text-slate-400"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">검색어</label>
                <div className="relative">
                  <input type="text" placeholder="수영장 이름 또는 주소" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-14 pl-12 pr-4 bg-slate-50 rounded-2xl text-base font-bold outline-none border-2 border-transparent focus:border-brand-500 focus:bg-white" />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">날짜 선택</label>
                <div className="flex gap-2">
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="flex-1 h-14 px-4 bg-slate-50 rounded-2xl text-base font-bold outline-none border-2 border-transparent focus:border-brand-500" />
                  {!isTodaySelected && (
                    <button onClick={resetDate} className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 active:scale-90"><RotateCcw size={20} /></button>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">지역 선택</label>
                <div className="grid grid-cols-3 gap-2">
                  {REGIONS.map(r => (
                    <button key={r} onClick={() => setSelectedRegion(r)} className={`h-11 rounded-xl font-bold text-xs border-2 transition-all ${selectedRegion === r ? 'bg-brand-50 border-brand-500 text-brand-600' : 'bg-white border-slate-100 text-slate-500'}`}>{r}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setIsFilterOpen(false)} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-lg active:scale-95 transition-all">필터 적용하기</button>
            </div>
          </div>
        </div>
      )}

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
          onUpdatePool={async (p) => { await savePool(p); await loadData(); setSelectedPoolDetail(p); }}
          onEditRequest={(p) => { setEditingPool(p); setView('form'); setSelectedPoolDetail(null); }}
          onDeleteRequest={async (id) => { 
            if(confirm('이 수영장 정보를 삭제할까요?')) {
              await deletePool(id); 
              await loadData(); 
              setSelectedPoolDetail(null); 
              showToast('정보가 삭제되었습니다.');
            }
          }}
          isUserCreated={true}
          user={null}
          onLoginRequest={() => {}} 
        />
      )}
    </div>
  );
}

export default App;
