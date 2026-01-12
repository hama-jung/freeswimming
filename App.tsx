
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Waves, LocateFixed, CalendarCheck, Loader2, CheckCircle, MapPin, Info, Map as MapIcon, List as ListIcon, X, Plus, Calendar, Filter, EyeOff, ArrowLeft, Heart, AlertTriangle, Copy, ChevronRight } from 'lucide-react';
import { Pool, Region } from './types';
import { MOCK_POOLS, REGIONS } from './constants';
import PoolCard from './components/PoolCard';
import PoolDetail from './components/PoolDetail';
import PoolFormPage from './components/PoolFormPage';
import KoreaMap from './components/KoreaMap';
import { getStoredPools, savePool, deletePool } from './services/storageService';

/**
 * 하버사인 공식(Haversine Formula)을 이용한 두 좌표 간의 직선 거리 계산 (단위: km)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || typeof lat2 !== 'number' || typeof lon2 !== 'number') return 9999;
  const R = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isPoolAvailable(pool: Pool, targetDate: Date, checkRealtime: boolean = false): boolean {
  const dayIndex = targetDate.getDay(); 
  const dayOfMonth = targetDate.getDate();
  const weekOfMonth = Math.ceil(dayOfMonth / 7);
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const todayName = dayNames[dayIndex];
  const closed = pool.closedDays || "";
  if (closed.includes(`매주 ${todayName}요일`)) return false;
  const schedules = pool.freeSwimSchedule || [];
  const possibleSchedules = schedules.filter(s => {
    const scheduleWeeks = s.weeks || [0];
    const isCorrectWeek = scheduleWeeks.includes(0) || scheduleWeeks.includes(weekOfMonth);
    if (!isCorrectWeek) return false;
    const dayStr = s.day.replace(/\s/g, '');
    if (dayStr.includes(todayName)) return true;
    if (todayName === "일" && (dayStr.includes("일요일") || dayStr.includes("주말"))) return true;
    if (todayName === "토" && (dayStr.includes("토요일") || dayStr.includes("주말"))) return true;
    if (dayIndex >= 1 && dayIndex <= 5 && dayStr.includes("평일")) return true;
    return false;
  });
  if (possibleSchedules.length === 0) return false;
  if (checkRealtime) {
    return possibleSchedules.some(s => {
      if (!s.startTime) return false;
      const [startH, startM] = s.startTime.split(':').map(Number);
      return (startH * 60 + startM) >= currentMinutes;
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
  const [selectedRegion, setSelectedRegion] = useState<Region | "내주변">("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPoolDetail, setSelectedPoolDetail] = useState<Pool | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  useEffect(() => {
    loadData();
    if (navigator.geolocation) {
      const geoId = navigator.geolocation.watchPosition((pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, null, { enableHighAccuracy: true });
      return () => navigator.geolocation.clearWatch(geoId);
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

  const handleUpdatePoolData = async (updatedPool: Pool) => {
    // 1. 저장 의사 확인
    if (!window.confirm("입력하신 수영장 정보를 저장하시겠습니까?")) {
      return;
    }

    setIsLoading(true);
    try {
      // 2. 서비스 레이어를 통해 DB 저장 시도
      const result = await savePool(updatedPool);
      
      if (result.success) {
        // 3. 성공 알림창 띄우기
        alert("정보가 안전하게 저장되었습니다.");
        // 4. 확인 누르면 페이지 새로고침
        window.location.reload(); 
      } else {
        // 5. 실패 시 원인 알림
        alert(`저장에 실패했습니다.\n사유: ${result.error || '알 수 없는 오류'}\n\n도움말: DB에 'homepage_url' 컬럼이 있는지 확인해 주세요.`);
      }
    } catch (err: any) {
      console.error("Save Error:", err);
      alert("서버와 통신하는 중에 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNearMe = () => {
    if (selectedRegion === "내주변") {
      setSelectedRegion("전체");
      return;
    }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setSelectedRegion("내주변");
    });
  };

  const handleLogoClick = () => {
    setView('list'); setDisplayMode('list'); setSelectedRegion('전체'); setSearchQuery('');
    setShowAvailableOnly(false); setSelectedDate(todayStr); setSelectedPoolDetail(null);
  };

  const isTodaySelected = selectedDate === todayStr;

  const processedPools = useMemo(() => {
    const targetDateObj = new Date(selectedDate);
    let list = pools.map(p => ({
      ...p,
      distance: userLocation ? calculateDistance(userLocation.lat, userLocation.lng, p.lat, p.lng) : undefined,
      isAvailable: isPoolAvailable(p, targetDateObj, isTodaySelected)
    }));
    list = list.filter(p => view === 'private' ? p.isPublic === false : p.isPublic !== false);
    if (view !== 'private') {
      if (selectedRegion === "내주변" && userLocation) {
        list = list.filter(p => p.distance !== undefined && p.distance <= 8);
        list.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      } else if (selectedRegion !== "전체" && selectedRegion !== "내주변") {
        list = list.filter(p => p.region === selectedRegion);
        if (userLocation) list.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      } else if (userLocation) {
        list.sort((a, b) => (a.distance || 0) - (b.distance || 0));
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
          <p className="font-bold text-slate-600">처리 중입니다...</p>
        </div>
      )}

      <header className="bg-white border-b border-slate-100 z-50 sticky top-0 shrink-0">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <button className="flex items-center gap-3 group cursor-pointer focus:outline-none" onClick={handleLogoClick}>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Waves size={24} strokeWidth={2.5} />
            </div>
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
          onSave={handleUpdatePoolData} 
          onCancel={() => { setView('list'); setEditingPool(undefined); }} 
        />
      ) : (
        <>
          <div className="bg-white border-b border-slate-100 z-40 sticky top-16 sm:top-20 shrink-0">
            <div className="max-w-[1280px] mx-auto">
              <div className="hidden sm:flex px-6 py-4 gap-4 items-center border-b border-slate-50">
                <div className="relative flex-1 max-md">
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

              <div className="flex sm:hidden px-4 py-3 justify-center items-center gap-4">
                <button onClick={handleNearMe} className={`flex-1 flex flex-col items-center justify-center h-14 rounded-2xl transition-all border-2 ${selectedRegion === "내주변" ? 'bg-brand-600 border-brand-600 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                  <LocateFixed size={20} />
                  <span className="text-[10px] font-black mt-1">내주변</span>
                </button>
                <button onClick={() => setShowAvailableOnly(!showAvailableOnly)} disabled={!isTodaySelected} className={`flex-1 flex flex-col items-center justify-center h-14 rounded-2xl transition-all border-2 ${!isTodaySelected ? 'bg-slate-100 text-slate-200 border-slate-50' : (showAvailableOnly ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-500')}`}>
                  <CalendarCheck size={20} />
                  <span className="text-[10px] font-black mt-1">오늘가능</span>
                </button>
                <button onClick={() => setSelectedRegion("전체")} className="flex-1 flex flex-col items-center justify-center h-14 bg-slate-900 text-white rounded-2xl transition-all border-2 border-slate-900 shadow-md">
                  <Filter size={20} />
                  <span className="text-[10px] font-black mt-1">전체보기</span>
                </button>
              </div>
            </div>
          </div>

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
            if(confirm('정말로 이 수영장 정보를 삭제하시겠습니까?')) {
              setIsLoading(true);
              const ok = await deletePool(id); 
              if(ok) {
                alert("정보가 삭제되었습니다.");
                window.location.reload();
              }
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
