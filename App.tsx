
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Waves, LocateFixed, CalendarCheck, PlusCircle, Loader2, CheckCircle, MapPin, Info, Map as MapIcon, List as ListIcon } from 'lucide-react';
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

function isPoolAvailableNow(pool: Pool): boolean {
  const now = new Date();
  const day = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const closed = pool.closedDays || "";
  if (closed.includes("매주 월요일") && day === 1) return false;
  if (closed.includes("매주 일요일") && day === 0) return false;

  let dayType: any = "평일(월-금)";
  if (day === 0) dayType = "일요일";
  else if (day === 6) dayType = "토요일";

  const schedule = pool.freeSwimSchedule.filter(s => s.day === dayType);
  return schedule.some(s => {
    const [startH, startM] = s.startTime.split(':').map(Number);
    const [endH, endM] = s.endTime.split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    return currentMinutes >= startMin && currentMinutes < endMin;
  });
}

function App() {
  const [view, setView] = useState<'list' | 'form'>('list');
  // 기본 디스플레이 모드를 'list'로 설정
  const [displayMode, setDisplayMode] = useState<'map' | 'list'>('list');
  const [pools, setPools] = useState<Pool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPool, setEditingPool] = useState<Pool | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [selectedRegion, setSelectedRegion] = useState<Region | "내주변">("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPoolDetail, setSelectedPoolDetail] = useState<Pool | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

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

  const processedPools = useMemo(() => {
    let list = pools.map(p => ({
      ...p,
      distance: userLocation ? calculateDistance(userLocation.lat, userLocation.lng, p.lat, p.lng) : undefined,
      isAvailable: isPoolAvailableNow(p)
    }));

    if (selectedRegion === "내주변" && userLocation) {
      list = list.filter(p => p.distance !== undefined && p.distance <= 15);
      list.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else if (selectedRegion !== "전체") {
      list = list.filter(p => p.region === selectedRegion);
    }

    if (showAvailableOnly) {
      list = list.filter(p => p.isAvailable);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q));
    }

    return list;
  }, [pools, userLocation, selectedRegion, showAvailableOnly, searchQuery]);

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
    <div className="h-screen flex flex-col font-sans overflow-hidden bg-[#f8fafc]">
      {isLoading && (
        <div className="fixed inset-0 z-[100] glass flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
          <p className="font-bold text-slate-600">수영장 데이터 동기화 중...</p>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-base font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header - Centered 1280px */}
      <header className="h-20 px-6 glass border-b border-slate-200 shrink-0 z-40 flex justify-center">
        <div className="w-full max-w-[1280px] flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-200">
              <Waves size={32} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">자유수영.kr</h1>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 bg-slate-100 p-2 rounded-2xl">
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

          <button 
            onClick={() => setView('form')}
            className="bg-brand-600 text-white h-14 px-8 rounded-2xl font-black text-lg hover:bg-brand-700 transition-all flex items-center gap-2 shadow-lg shadow-brand-100 active:scale-95"
          >
            <PlusCircle size={24} />
            <span className="hidden sm:inline">수영장 등록</span>
          </button>
        </div>
      </header>

      {/* Search & Filter Bar - Centered 1280px */}
      <div className="bg-white border-b border-slate-100 z-30 shrink-0 flex flex-col items-center">
        <div className="w-full max-w-[1280px] px-6 py-12 flex flex-col gap-10">
          <div className="flex flex-col md:flex-row items-stretch gap-6 justify-center">
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="검색할 수영장 이름이나 주소를 입력하세요" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-20 pl-20 pr-10 bg-slate-100 border-2 border-transparent focus:border-brand-500 focus:bg-white rounded-[32px] text-2xl font-bold outline-none transition-all placeholder:text-slate-400 shadow-sm"
              />
              <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400" size={32} />
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={handleNearMe}
                className="h-20 px-10 shrink-0 bg-white border-2 border-slate-200 rounded-[32px] font-black text-xl text-slate-700 hover:border-brand-500 hover:text-brand-600 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-sm"
              >
                <LocateFixed size={28} className="text-brand-500" /> 내주변
              </button>
              <button 
                onClick={() => setShowAvailableOnly(!showAvailableOnly)}
                className={`h-20 px-10 shrink-0 rounded-[32px] font-black text-xl flex items-center justify-center gap-3 transition-all active:scale-95 border-2 shadow-sm ${showAvailableOnly ? 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-100' : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-500'}`}
              >
                <CalendarCheck size={28} /> 이용가능만
              </button>
            </div>
          </div>
          
          <div className="flex w-full overflow-x-auto no-scrollbar gap-4 justify-start sm:justify-center">
            {REGIONS.map(r => (
              <button 
                key={r} 
                onClick={() => setSelectedRegion(r)}
                className={`h-14 px-8 shrink-0 rounded-2xl font-black text-lg transition-all border-2 ${selectedRegion === r ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-100' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area - Centered Content */}
      <main className="flex-1 relative overflow-hidden flex flex-col items-center">
        {displayMode === 'map' ? (
          <div className="absolute inset-0">
            <KoreaMap 
              pools={processedPools} 
              onSelectPool={setSelectedPoolDetail}
              userLocation={userLocation}
              selectedRegion={selectedRegion}
              onRequestLocation={handleNearMe}
            />
          </div>
        ) : (
          <div className="w-full h-full overflow-y-auto">
            <div className="max-w-[1280px] mx-auto px-6 py-16">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                {processedPools.map(p => (
                  <PoolCard 
                    key={p.id} 
                    pool={p} 
                    onClick={setSelectedPoolDetail} 
                    distance={p.distance}
                  />
                ))}
              </div>
              {processedPools.length === 0 && (
                <div className="py-52 text-center flex flex-col items-center justify-center">
                  <div className="w-32 h-32 bg-slate-200/50 rounded-full flex items-center justify-center mb-10">
                    <Info size={64} className="text-slate-400" />
                  </div>
                  <h3 className="text-4xl font-black text-slate-400 mb-4">검색 결과가 없습니다</h3>
                  <p className="text-slate-500 text-xl font-bold">지역 필터를 바꾸거나 다른 키워드로 검색해 보세요.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Display Toggle Button (Float) */}
      <div className="sm:hidden fixed bottom-10 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-xl text-white rounded-[40px] shadow-2xl p-2.5 flex items-center border border-white/10">
        <button 
          onClick={() => setDisplayMode('map')}
          className={`px-12 py-5 rounded-[32px] text-lg font-black transition-all ${displayMode === 'map' ? 'bg-brand-600 text-white' : 'text-slate-400'}`}
        >
          지도
        </button>
        <button 
          onClick={() => setDisplayMode('list')}
          className={`px-12 py-5 rounded-[32px] text-lg font-black transition-all ${displayMode === 'list' ? 'bg-brand-600 text-white' : 'text-slate-400'}`}
        >
          목록
        </button>
      </div>

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
