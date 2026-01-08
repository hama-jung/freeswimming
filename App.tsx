
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
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleUpdatePoolData = async (updatedPool: Pool) => {
    setIsLoading(true);
    try {
      const success = await savePool(updatedPool);
      if (success) {
        const freshList = await getStoredPools();
        setPools(freshList);
        const freshMatch = freshList.find(p => p.id === updatedPool.id);
        if (freshMatch) setSelectedPoolDetail({ ...freshMatch });
        showToast("수영장 정보가 성공적으로 반영되었습니다.", 'success');
      } else {
        showToast("데이터베이스 저장에 실패했습니다. Supabase RLS 정책 또는 Vercel 환경 변수를 확인하세요.", 'error');
      }
    } catch (e) {
      showToast("데이터 처리 중 예기치 못한 오류가 발생했습니다.", 'error');
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
          <span className="text-sm font-black">{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-white/50 hover:text-white"><X size={16} /></button>
        </div>
      )}

      {/* 모바일 필터 오버레이 */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-[100] bg-white animate-in slide-in-from-bottom-full duration-300 flex flex-col">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h2 className="text-xl font-black text-slate-900">상세 필터 및 보기</h2>
            <button onClick={() => setIsFilterOpen(false)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"><X /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">보기 모드</h3>
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button onClick={() => setDisplayMode('map')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${displayMode === 'map' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500'}`}><MapIcon size={18} /> 지도</button>
                <button onClick={() => setDisplayMode('list')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${displayMode === 'list' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500'}`}><ListIcon size={18} /> 목록</button>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">수영장 검색</h3>
              <div className="relative">
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="수영장 이름 또는 동네" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">날짜 선택</h3>
                {!isTodaySelected && <button onClick={() => setSelectedDate(todayStr)} className="text-xs font-black text-brand-600 flex items-center gap-1"><X size={12} strokeWidth={3} /> 오늘로 초기화</button>}
              </div>
              <div className="relative">
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" />
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">지역 선택</h3>
              <div className="grid grid-cols-3 gap-2">
                {REGIONS.map(reg => (
                  <button key={reg} onClick={() => setSelectedRegion(selectedRegion === reg ? "전체" : reg)} className={`py-3 rounded-xl font-black text-xs border-2 transition-all ${selectedRegion === reg ? 'bg-brand-600 border-brand-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500'}`}>{reg}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-slate-100"><button onClick={() => setIsFilterOpen(false)} className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">설정 적용하기</button></div>
        </div>
      )}

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

      {view === 'list' && (
        <div className="bg-white border-b border-slate-100 z-40 sticky top-16 sm:top-20 shrink-0">
          <div className="max-w-[1280px] mx-auto">
            <div className="hidden sm:flex px-6 py-4 gap-4 items-center border-b border-slate-50">
              <div className="relative flex-1 max-w-md">
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="어느 수영장을 찾으세요?" className="w-full pl-12 pr-4 h-14 bg-slate-50 border border-slate-200 rounded-2xl text-xl font-black focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all outline-none" />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
              </div>
              <div className="flex gap-2 shrink-0">
                <div className="relative w-56 group">
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full h-14 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none" />
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  {!isTodaySelected && <button onClick={() => setSelectedDate(todayStr)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-slate-200 rounded-full transition-all active:scale-90"><X size={16} strokeWidth={3} /></button>}
                </div>
                <button onClick={handleNearMe} className={`h-14 px-6 rounded-2xl font-black text-sm flex items-center gap-2 transition-all border-2 ${selectedRegion === "내주변" ? 'bg-brand-600 border-brand-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'}`}><LocateFixed size={18} /> 내주변</button>
                <button onClick={() => setShowAvailableOnly(!showAvailableOnly)} disabled={!isTodaySelected} className={`h-14 px-6 rounded-2xl font-black text-sm flex items-center gap-2 transition-all border-2 ${!isTodaySelected ? 'bg-slate-50 text-slate-300 border-slate-100' : (showAvailableOnly ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300')}`}><CalendarCheck size={18} /> 오늘가능</button>
              </div>
            </div>
            <div className="hidden sm:flex px-6 py-3 items-center gap-2 overflow-x-auto no-scrollbar">
              {REGIONS.map(reg => <button key={reg} onClick={() => setSelectedRegion(selectedRegion === reg ? "전체" : reg)} className={`shrink-0 h-9 px-5 rounded-full font-black text-xs transition-all border-2 ${selectedRegion === reg ? 'bg-brand-600 border-brand-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}>{reg}</button>)}
            </div>
            <div className="sm:hidden px-4 py-3 flex gap-2">
              <button onClick={handleNearMe} className={`flex-1 h-12 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border-2 transition-all ${selectedRegion === "내주변" ? 'bg-brand-600 border-brand-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-700'}`}><LocateFixed size={18} /> 내주변</button>
              <button onClick={() => setShowAvailableOnly(!showAvailableOnly)} disabled={!isTodaySelected} className={`flex-1 h-12 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border-2 transition-all ${!isTodaySelected ? 'bg-slate-50 text-slate-200' : (showAvailableOnly ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-700')}`}><CalendarCheck size={18} /> 오늘가능</button>
              <button onClick={() => setIsFilterOpen(true)} className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all ${isTodaySelected && showAvailableOnly || selectedRegion !== '전체' ? 'bg-brand-600 text-white' : 'bg-slate-900 text-white'}`}><Filter size={20} /></button>
            </div>
          </div>
        </div>
      )}

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
            <div className="h-24 sm:hidden"></div>
          </div>
        )}
      </main>

      {view !== 'form' && (
        <footer className="bg-white border-t border-slate-100 py-12 px-6 mt-auto">
          <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 text-slate-800 font-black text-lg"><Waves className="w-5 h-5 text-brand-600" /> 자유수영.kr</div>
            <div className="flex items-center gap-4">
              <button onClick={() => setView('private')} className={`text-xs font-black px-4 py-2 rounded-xl transition-all ${view === 'private' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600 border border-slate-200'}`}>비공개 수영장 보기</button>
              <span className="text-xs text-slate-300 font-bold">© 2024 Freeswim KR</span>
            </div>
          </div>
        </footer>
      )}

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
              else showToast('데이터베이스 삭제 실패 (권한 확인 필요)', 'error');
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
