
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Waves, LocateFixed, CalendarCheck, Loader2, CheckCircle, MapPin, Info, Map as MapIcon, List as ListIcon, X, Plus, Calendar, Filter, EyeOff, ArrowLeft, Heart, AlertTriangle, Copy, ChevronRight } from 'lucide-react';
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
  const dayIndex = targetDate.getDay(); 
  const dayOfMonth = targetDate.getDate();
  const weekOfMonth = Math.ceil(dayOfMonth / 7);
  const currentMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const todayName = dayNames[dayIndex];
  
  const closed = pool.closedDays || "";
  if (closed.includes(`매주 ${todayName}요일`)) return false;
  
  const schedules = pool.freeSwimSchedule || [];
  const possibleSchedules = schedules.filter(s => {
    const scheduleWeeks = s.weeks || [0];
    const isCorrectWeek = scheduleWeeks.includes(0) || scheduleWeeks.includes(weekOfMonth);
    if (!isCorrectWeek) return false;
    if (s.day.includes(todayName)) return true;
    if (todayName === "일" && (s.day === "일요일" || s.day === "주말/공휴일")) return true;
    if (todayName === "토" && (s.day === "토요일" || s.day === "주말/공휴일")) return true;
    if (dayIndex >= 1 && dayIndex <= 5) {
      if (s.day === "평일(월-금)") return true;
      if (s.day === `${todayName}요일`) return true;
    }
    return false;
  });

  if (possibleSchedules.length === 0) return false;

  if (checkRealtime) {
    return possibleSchedules.some(s => {
      const [startH, startM] = s.startTime.split(':').map(Number);
      const [endH, endM] = s.endTime.split(':').map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      return currentMinutes >= startMin && currentMinutes < endMin;
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
  const [toastMessage, setToastMessage] = useState<{text: string, type: 'success'|'error', code?: string} | null>(null);
  
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  
  const [selectedRegion, setSelectedRegion] = useState<Region | "내주변">("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPoolDetail, setSelectedPoolDetail] = useState<Pool | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  useEffect(() => {
    loadData();
    // 접속 시 위치 정보 미리 가져오기
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, () => {});
    }
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const stored = await getStoredPools();
      setPools(stored.length > 0 ? stored : MOCK_POOLS);
    } catch (e) {
      setPools(MOCK_POOLS);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (text: string, type: 'success'|'error' = 'success', code?: string) => {
    setToastMessage({ text, type, code });
    if (type === 'success') setTimeout(() => setToastMessage(null), 5000);
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
        showToast("정보가 저장되었습니다.");
      } else {
        showToast(result.error || "저장 오류", 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNearMe = () => {
    if (!navigator.geolocation) return alert("위치 정보를 지원하지 않습니다.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSelectedRegion("내주변");
        setDisplayMode('map'); // 내주변 클릭 시 지도로 전환하여 직관성 제공
        showToast("내 주변 5km 수영장을 찾았습니다.");
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

    list = list.filter(p => view === 'private' ? p.isPublic === false : p.isPublic !== false);

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

  return (
    <div className={`flex flex-col font-sans bg-[#f8fafc] ${displayMode === 'map' && view === 'list' ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      {isLoading && (
        <div className="fixed inset-0 z-[200] bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
          <p className="font-bold text-slate-600">데이터 처리 중...</p>
        </div>
      )}

      {toastMessage && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-lg p-6 rounded-[32px] shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-4 transition-all ${toastMessage.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {toastMessage.type === 'success' ? <CheckCircle className="w-6 h-6 text-emerald-400" /> : <AlertTriangle className="w-6 h-6 text-yellow-300" />}
              <div className="flex flex-col">
                <span className="text-base font-black">{toastMessage.type === 'success' ? '성공' : '오류'}</span>
                <span className="text-sm font-bold opacity-90">{toastMessage.text}</span>
              </div>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-white/50 hover:text-white p-1"><X size={20} /></button>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-100 z-50 sticky top-0 shrink-0">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <button className="flex items-center gap-3 group cursor-pointer focus:outline-none" onClick={handleLogoClick}>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Waves size={24} strokeWidth={3} /></div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-900">자유수영.kr</h1>
          </button>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex bg-slate-100 p-1 rounded-2xl mr-4">
              <button onClick={() => setDisplayMode('map')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black transition-all ${displayMode === 'map' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}><MapIcon size={18} /> 지도</button>
              <button onClick={() => setDisplayMode('list')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black transition-all ${displayMode === 'list' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}><ListIcon size={18} /> 목록</button>
            </div>
            <button onClick={() => setView('form')} className="bg-brand-600 text-white px-4 sm:px-6 h-10 sm:h-12 rounded-xl font-black text-xs sm:text-sm shadow-md active:scale-95 flex items-center gap-2 transition-all">
              <Plus size={18} strokeWidth={3} /> <span className="hidden sm:inline">수영장 등록</span><span className="sm:hidden">등록</span>
            </button>
          </div>
        </div>
      </header>

      {view === 'form' ? (
        <PoolFormPage 
          initialData={editingPool} 
          onSave={async (p) => {
            setEditingPool(undefined);
            setView('list');
            await handleUpdatePoolData(p);
          }} 
          onCancel={() => { setView('list'); setEditingPool(undefined); }} 
        />
      ) : (
        <>
          <div className="bg-white border-b border-slate-100 z-40 sticky top-16 sm:top-20 shrink-0">
            <div className="max-w-[1280px] mx-auto">
              <div className="hidden sm:flex px-6 py-4 gap-4 items-center border-b border-slate-50">
                <div className="relative flex-1 max-w-md">
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="어느 수영장을 찾으세요?" className="w-full pl-12 pr-4 h-14 bg-slate-50 border border-slate-200 rounded-2xl text-xl font-black focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all outline-none" />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
                </div>
                <div className="flex gap-2 shrink-0">
                  <div className="flex gap-1 items-center bg-slate-100 p-1 rounded-2xl">
                    <div className="relative w-48">
                      <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full h-12 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-black outline-none" />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    </div>
                    <button onClick={() => setShowAvailableOnly(!showAvailableOnly)} disabled={!isTodaySelected} className={`h-12 px-4 rounded-xl font-black text-sm flex items-center gap-2 transition-all ${!isTodaySelected ? 'bg-slate-200 text-slate-400' : (showAvailableOnly ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:text-slate-800')}`}><CalendarCheck size={18} /> 오늘가능</button>
                  </div>
                  <button onClick={handleNearMe} className={`h-14 px-6 rounded-2xl font-black text-sm flex items-center gap-2 transition-all border-2 ${selectedRegion === "내주변" ? 'bg-brand-600 border-brand-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'}`}><LocateFixed size={18} /> 내주변</button>
                  <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value as Region)} className="h-14 px-4 bg-white border border-slate-100 rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-brand-500">
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* 모바일 3버튼 액션 바 */}
              <div className="flex sm:hidden px-4 py-3 justify-center items-center gap-4">
                <button onClick={handleNearMe} className={`flex-1 flex flex-col items-center justify-center h-14 rounded-2xl transition-all border-2 ${selectedRegion === "내주변" ? 'bg-brand-600 border-brand-600 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                  <LocateFixed size={20} />
                  <span className="text-[10px] font-black mt-1">내주변</span>
                </button>
                <button onClick={() => setShowAvailableOnly(!showAvailableOnly)} disabled={!isTodaySelected} className={`flex-1 flex flex-col items-center justify-center h-14 rounded-2xl transition-all border-2 ${!isTodaySelected ? 'bg-slate-100 text-slate-200 border-slate-50' : (showAvailableOnly ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-500')}`}>
                  <CalendarCheck size={20} />
                  <span className="text-[10px] font-black mt-1">오늘가능</span>
                </button>
                <button onClick={() => setIsMobileFilterOpen(true)} className="flex-1 flex flex-col items-center justify-center h-14 bg-slate-900 text-white rounded-2xl transition-all border-2 border-slate-900 shadow-md">
                  <Filter size={20} />
                  <span className="text-[10px] font-black mt-1">필터</span>
                </button>
              </div>
            </div>
          </div>

          {/* 모바일 상세 필터 오버레이 */}
          {isMobileFilterOpen && (
            <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
              <header className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
                <h2 className="text-xl font-black text-slate-900">상세 필터 및 검색</h2>
                <button onClick={() => setIsMobileFilterOpen(false)} className="p-2 text-slate-400"><X size={28} /></button>
              </header>
              <div className="flex-1 overflow-y-auto p-6 space-y-10 pb-20">
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">보기 모드</label>
                  <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl">
                    <button onClick={() => { setDisplayMode('map'); setIsMobileFilterOpen(false); }} className={`flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all ${displayMode === 'map' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500'}`}><MapIcon size={18} /> 지도보기</button>
                    <button onClick={() => { setDisplayMode('list'); setIsMobileFilterOpen(false); }} className={`flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all ${displayMode === 'list' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500'}`}><ListIcon size={18} /> 목록보기</button>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">수영장 검색</label>
                  <div className="relative">
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="수영장 이름 또는 주소" className="w-full pl-12 pr-4 h-14 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-bold focus:ring-2 focus:ring-brand-500 outline-none" />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">날짜 선택</label>
                  <div className="relative">
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" />
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">지역 선택</label>
                  <div className="grid grid-cols-3 gap-2">
                    {REGIONS.map(r => (
                      <button key={r} onClick={() => setSelectedRegion(r)} className={`py-3 rounded-xl text-xs font-black border-2 transition-all ${selectedRegion === r ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}>{r}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 bg-white border-t border-slate-100 sticky bottom-0">
                <button onClick={() => setIsMobileFilterOpen(false)} className="w-full h-16 bg-brand-600 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">적용 및 닫기</button>
              </div>
            </div>
          )}

          <main className={`flex-1 relative ${displayMode === 'map' ? 'overflow-hidden' : ''}`}>
            {displayMode === 'map' ? (
              <div className="absolute inset-0">
                <KoreaMap pools={processedPools} onSelectPool={setSelectedPoolDetail} userLocation={userLocation} selectedRegion={selectedRegion} onRequestLocation={handleNearMe} />
              </div>
            ) : (
              <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
                  {processedPools.map(p => <PoolCard key={p.id} pool={p} onClick={setSelectedPoolDetail} distance={p.distance} />)}
                </div>
                {processedPools.length === 0 && (
                  <div className="py-20 text-center">
                    <Info size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-bold">검색 결과가 없습니다.</p>
                  </div>
                )}
              </div>
            )}
          </main>
        </>
      )}

      {selectedPoolDetail && (
        <PoolDetail 
          pool={selectedPoolDetail} 
          onClose={() => setSelectedPoolDetail(null)} 
          onUpdatePool={handleUpdatePoolData}
          onEditRequest={(p) => { setEditingPool(p); setView('form'); setSelectedPoolDetail(null); }}
          onDeleteRequest={async (id) => { 
            if(confirm('삭제하시겠습니까?')) {
              setIsLoading(true);
              await deletePool(id); 
              await loadData(); 
              setSelectedPoolDetail(null); 
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
