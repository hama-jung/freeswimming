
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Waves, LocateFixed, CalendarCheck, Loader2, CheckCircle, MapPin, Info, Map as MapIcon, List as ListIcon, X, Plus, Calendar, Filter, EyeOff, ArrowLeft, Heart, AlertTriangle, Copy, ChevronRight, Settings2, Clock4, ChevronDown, Download } from 'lucide-react';
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

/**
 * 특정 수영장이 지정된 날짜와 시간 범위 내에 운영되는지 확인
 */
function isPoolAvailableInTimeRange(pool: Pool, targetDate: Date, filterStart: string, filterEnd: string): boolean {
  const dayIndex = targetDate.getDay(); 
  const dayOfMonth = targetDate.getDate();
  const weekOfMonth = Math.ceil(dayOfMonth / 7);
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
    let isCorrectDay = false;
    if (dayStr.includes(todayName)) isCorrectDay = true;
    else if (todayName === "일" && (dayStr.includes("일요일") || dayStr.includes("주말"))) isCorrectDay = true;
    else if (todayName === "토" && (dayStr.includes("토요일") || dayStr.includes("주말"))) isCorrectDay = true;
    else if (dayIndex >= 1 && dayIndex <= 5 && dayStr.includes("평일")) isCorrectDay = true;
    
    return isCorrectDay;
  });

  if (possibleSchedules.length === 0) return false;

  const fStart = timeToMinutes(filterStart);
  const fEnd = timeToMinutes(filterEnd);

  return possibleSchedules.some(s => {
    const sStart = timeToMinutes(s.startTime);
    const sEnd = timeToMinutes(s.endTime);
    return Math.max(fStart, sStart) <= Math.min(fEnd, sEnd);
  });
}

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
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
  const [filterStartTime, setFilterStartTime] = useState<string>("00:00");
  const [filterEndTime, setFilterEndTime] = useState<string>("23:59");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  
  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    loadData();
    if (navigator.geolocation) {
      const geoId = navigator.geolocation.watchPosition((pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, null, { enableHighAccuracy: true });
      return () => navigator.geolocation.clearWatch(geoId);
    }

    // PWA Install Event Listener
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      setDeferredPrompt(null);
    });
  };

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
    if (!window.confirm("입력하신 수영장 정보를 저장하시겠습니까?")) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await savePool(updatedPool);
      if (result.success) {
        alert("정보가 안전하게 저장되었습니다.");
        window.location.reload(); 
      } else {
        const errorMsg = result.error || "";
        let helpText = "DB 설정을 확인해 주세요.";
        if (errorMsg.includes("has_sauna")) {
          helpText = "Supabase SQL Editor에서 'ALTER TABLE pools ADD COLUMN has_sauna BOOLEAN DEFAULT false;' 명령어를 실행해 주세요.";
        } else if (errorMsg.includes("homepage_url")) {
          helpText = "Supabase SQL Editor에서 'ALTER TABLE pools ADD COLUMN homepage_url TEXT;' 명령어를 실행해 주세요.";
        }
        alert(`저장에 실패했습니다.\n사유: ${errorMsg}\n\n[해결 방법]: ${helpText}`);
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
    setFilterStartTime("00:00"); setFilterEndTime("23:59"); setIsTimePickerOpen(false);
  };

  const isTodaySelected = selectedDate === todayStr;
  const isTimeFilterApplied = filterStartTime !== "00:00" || filterEndTime !== "23:59";
  
  const isFilterActive = useMemo(() => {
    return searchQuery !== "" || 
           (selectedRegion !== "전체" && selectedRegion !== "내주변") || 
           selectedDate !== todayStr || 
           showAvailableOnly ||
           isTimeFilterApplied;
  }, [searchQuery, selectedRegion, selectedDate, showAvailableOnly, todayStr, isTimeFilterApplied]);

  const processedPools = useMemo(() => {
    const targetDateObj = new Date(selectedDate);
    let list = pools.map(p => ({
      ...p,
      distance: userLocation ? calculateDistance(userLocation.lat, userLocation.lng, p.lat, p.lng) : undefined,
      isAvailable: isPoolAvailableInTimeRange(p, targetDateObj, filterStartTime, filterEndTime)
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
      
      if (showAvailableOnly || isTimeFilterApplied) {
        list = list.filter(p => p.isAvailable);
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q));
    }
    return list;
  }, [pools, userLocation, selectedRegion, showAvailableOnly, searchQuery, selectedDate, filterStartTime, filterEndTime, isTodaySelected, view, isTimeFilterApplied]);

  return (
    <div className={`flex flex-col font-sans bg-[#f8fafc] ${displayMode === 'map' && view === 'list' ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      {isLoading && (
        <div className="fixed inset-0 z-[200] bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-brand-600 animate-spin mb-4" />
          <p className="font-bold text-sm sm:text-base text-slate-600">처리 중입니다...</p>
        </div>
      )}

      <header className="bg-white border-b border-slate-100 z-50 sticky top-0 shrink-0">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-14 sm:h-20 flex items-center justify-between">
          <button className="flex items-center gap-2 sm:gap-3 group cursor-pointer focus:outline-none" onClick={handleLogoClick}>
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-brand-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-lg">
              <Waves size={20} className="sm:size-6" strokeWidth={2.5} />
            </div>
            <h1 className="text-base sm:text-2xl font-black text-slate-900">자유수영.kr</h1>
          </button>
          <div className="flex items-center gap-2">
            {/* 앱 설치 버튼 (설치 가능한 경우에만 표시) */}
            {deferredPrompt && (
              <button 
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-900 text-white rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-black shadow-md active:scale-95 transition-all mr-1 animate-pulse"
              >
                <Download size={14} className="sm:size-4" />
                <span className="hidden sm:inline">앱 설치</span><span className="sm:hidden">설치</span>
              </button>
            )}

            <div className="hidden sm:flex bg-slate-100 p-1 rounded-2xl mr-4">
              <button onClick={() => setDisplayMode('map')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black transition-all ${displayMode === 'map' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}><MapIcon size={18} /> 지도</button>
              <button onClick={() => setDisplayMode('list')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black transition-all ${displayMode === 'list' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}><ListIcon size={18} /> 목록</button>
            </div>
            <button onClick={() => setView('form')} className="bg-brand-600 text-white px-3 sm:px-6 h-9 sm:h-12 rounded-lg sm:rounded-xl font-black text-[10px] sm:text-sm shadow-md active:scale-95 flex items-center gap-1.5 transition-all">
              <Plus size={14} className="sm:size-5" strokeWidth={3} /> <span className="hidden sm:inline">수영장 등록</span><span className="sm:hidden">등록</span>
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
          <div className="bg-white border-b border-slate-100 z-40 sticky top-14 sm:top-20 shrink-0">
            <div className="max-w-[1280px] mx-auto">
              {/* 데스크탑 필터바 */}
              <div className="hidden sm:flex px-6 py-4 gap-4 items-center border-b border-slate-50">
                <div className="relative flex-1 max-md">
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="어느 수영장을 찾으세요?" className="w-full pl-12 pr-4 h-14 bg-slate-50 border border-slate-200 rounded-2xl text-xl font-black focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all outline-none" />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
                </div>
                <div className="flex gap-2 shrink-0">
                  <div className="flex gap-1 items-center bg-slate-100 p-1 rounded-2xl relative">
                    <div className="relative w-40">
                      <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full h-12 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-black outline-none" />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    </div>
                    
                    {/* PC 전용 시간 드롭다운 버튼 */}
                    <div className="relative">
                      <button 
                        onClick={() => setIsTimePickerOpen(!isTimePickerOpen)}
                        className={`h-12 px-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all border ${isTimeFilterApplied ? 'bg-brand-50 border-brand-200 text-brand-600' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'}`}
                      >
                        <Clock4 size={18} />
                        {isTimeFilterApplied && <span className="text-[10px] font-black">{filterStartTime}~{filterEndTime}</span>}
                        <ChevronDown size={14} className={`transition-transform duration-200 ${isTimePickerOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* 시간 선택 드롭다운 패널 */}
                      {isTimePickerOpen && (
                        <>
                          <div className="fixed inset-0 z-[60]" onClick={() => setIsTimePickerOpen(false)}></div>
                          <div className="absolute top-[calc(100%+8px)] right-0 z-[70] bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 min-w-[220px] animate-in slide-in-from-top-2 duration-200">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <Clock4 size={12} /> 시간 범위 설정
                            </h4>
                            <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <label className="text-[9px] font-black text-slate-400 mb-1 block">시작</label>
                                  <input type="time" value={filterStartTime} onChange={(e) => setFilterStartTime(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-black outline-none focus:ring-2 focus:ring-brand-500" />
                                </div>
                                <span className="text-slate-300 mt-4">~</span>
                                <div className="flex-1">
                                  <label className="text-[9px] font-black text-slate-400 mb-1 block">종료</label>
                                  <input type="time" value={filterEndTime} onChange={(e) => setFilterEndTime(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-black outline-none focus:ring-2 focus:ring-brand-500" />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => { setFilterStartTime("00:00"); setFilterEndTime("23:59"); setIsTimePickerOpen(false); }}
                                  className="flex-1 py-2 rounded-lg text-[10px] font-black text-slate-400 border border-slate-100 hover:bg-slate-50 transition-all"
                                >
                                  초기화
                                </button>
                                <button 
                                  onClick={() => setIsTimePickerOpen(false)}
                                  className="flex-1 py-2 bg-brand-600 text-white rounded-lg text-[10px] font-black shadow-md hover:bg-brand-700 transition-all"
                                >
                                  적용
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <button onClick={() => setShowAvailableOnly(!showAvailableOnly)} disabled={!isTodaySelected} className={`h-12 px-4 rounded-xl font-black text-sm flex items-center gap-2 transition-all ${!isTodaySelected ? 'bg-slate-200 text-slate-400' : (showAvailableOnly ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:text-slate-800')}`}><CalendarCheck size={18} /> 오늘가능</button>
                  </div>
                  <button onClick={handleNearMe} className={`h-14 px-6 rounded-2xl font-black text-sm flex items-center gap-2 transition-all border-2 ${selectedRegion === "내주변" ? 'bg-brand-600 border-brand-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'}`}><LocateFixed size={18} /> 내주변</button>
                  <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value as Region)} className="h-14 px-4 bg-white border border-slate-100 rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-brand-500">
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* 모바일 퀵 버튼 바 (기존 유지) */}
              <div className="flex sm:hidden px-4 py-2.5 justify-center items-center gap-3">
                <button onClick={handleNearMe} className={`flex-1 flex flex-col items-center justify-center h-12 rounded-xl transition-all border ${selectedRegion === "내주변" ? 'bg-brand-600 border-brand-600 text-white shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                  <LocateFixed size={18} />
                  <span className="text-[9px] font-black mt-1 uppercase">Nearby</span>
                </button>
                <button onClick={() => setShowAvailableOnly(!showAvailableOnly)} disabled={!isTodaySelected} className={`flex-1 flex flex-col items-center justify-center h-12 rounded-xl transition-all border ${!isTodaySelected ? 'bg-slate-100 text-slate-200 border-slate-50' : (showAvailableOnly ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400')}`}>
                  <CalendarCheck size={18} />
                  <span className="text-[9px] font-black mt-1 uppercase">Today</span>
                </button>
                <button onClick={() => setIsFilterOpen(true)} className={`flex-1 relative flex flex-col items-center justify-center h-12 rounded-xl transition-all border ${isFilterActive ? 'bg-brand-50 border-brand-200 text-brand-600 shadow-sm' : 'bg-slate-900 border-slate-900 text-white shadow-sm'}`}>
                  <Filter size={18} />
                  <span className="text-[9px] font-black mt-1 uppercase">상세 검색</span>
                  {isFilterActive && (
                    <div className="absolute top-1.5 right-3 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></div>
                  )}
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
              <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-10">
                  {processedPools.map(p => <PoolCard key={p.id} pool={p} onClick={setSelectedPoolDetail} distance={p.distance} />)}
                </div>
              </div>
            )}
          </main>
        </>
      )}

      {/* 모바일 상세 검색 오버레이 (기존 유지) */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-[150] flex items-end sm:hidden bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full bg-white rounded-t-[32px] shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-300">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Settings2 className="text-brand-600 w-5 h-5" /> 상세 검색 설정
              </h3>
              <button onClick={() => setIsFilterOpen(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"><X size={18} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">시설명 또는 주소 검색</label>
                <div className="relative">
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="수영장 이름을 입력하세요" className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:border-brand-500 focus:bg-white transition-all outline-none" />
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">운영 일시 설정</label>
                <div className="space-y-3">
                  <div className="relative">
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" />
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input type="time" value={filterStartTime} onChange={(e) => setFilterStartTime(e.target.value)} className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" />
                      <Clock4 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    </div>
                    <span className="text-slate-300">~</span>
                    <div className="relative flex-1">
                      <input type="time" value={filterEndTime} onChange={(e) => setFilterEndTime(e.target.value)} className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" />
                      <Clock4 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">보기 방식 선택</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setDisplayMode('map')} className={`flex items-center justify-center gap-2 h-11 rounded-xl font-black text-xs transition-all border ${displayMode === 'map' ? 'bg-brand-600 border-brand-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500'}`}><MapIcon size={16} /> 지도 중심</button>
                  <button onClick={() => setDisplayMode('list')} className={`flex items-center justify-center gap-2 h-11 rounded-xl font-black text-xs transition-all border ${displayMode === 'list' ? 'bg-brand-600 border-brand-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500'}`}><ListIcon size={16} /> 목록 중심</button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">지역별 필터</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {REGIONS.map(r => (
                    <button key={r} onClick={() => setSelectedRegion(r)} className={`h-9 rounded-lg font-black text-[10px] transition-all border ${selectedRegion === r ? 'bg-brand-50 border-brand-400 text-brand-600' : 'bg-slate-50 border-slate-50 text-slate-400'}`}>{r}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button onClick={() => { setSearchQuery(""); setSelectedRegion("전체"); setSelectedDate(todayStr); setShowAvailableOnly(false); setFilterStartTime("00:00"); setFilterEndTime("23:59"); }} className="flex-1 h-12 bg-white border border-slate-200 rounded-xl font-black text-xs text-slate-400 active:scale-95 transition-all">초기화</button>
              <button onClick={() => setIsFilterOpen(false)} className="flex-[2] h-12 bg-brand-600 text-white rounded-xl font-black text-xs shadow-lg active:scale-95 transition-all">검색 결과 적용하기</button>
            </div>
          </div>
        </div>
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
