
import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, Plus, Trash2, MapPin, Clock, DollarSign, ArrowLeft, Camera, Loader2, Search, CheckCircle2, Image as ImageIcon, Calendar as CalendarIcon, ChevronDown, ExternalLink, Map as MapIcon, Info, PlusCircle, RotateCcw } from 'lucide-react';
import { Pool, FreeSwimSchedule, FeeInfo, Region, DayType, FeeCategory, HolidayRule } from '../types';
import { REGIONS } from '../constants';
import { searchLocationWithGemini, MapSearchResult } from '../services/geminiService';

interface PoolFormPageProps {
  onSave: (pool: Pool) => void;
  onCancel: () => void;
  initialData?: Pool;
}

const DEFAULT_POOL_IMAGE = "https://images.unsplash.com/photo-1519315530759-39149795460a?auto=format&fit=crop&q=80&w=800";
const DRAFT_STORAGE_KEY = 'pool_form_draft';

const WEEK_DAYS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
const WEEK_NUMBERS = [
    { label: "매주", value: 0 },
    { label: "매월 첫번째", value: 1 },
    { label: "매월 두번째", value: 2 },
    { label: "매월 세번째", value: 3 },
    { label: "매월 네번째", value: 4 },
    { label: "매월 다섯번째", value: 5 },
];

const PoolFormPage: React.FC<PoolFormPageProps> = ({ onSave, onCancel, initialData }) => {
  const isEditMode = !!initialData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  
  // 장소 검색 관련 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MapSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, lng: number} | null>(initialData ? {lat: initialData.lat, lng: initialData.lng} : null);

  // 기본 정보 상태
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [region, setRegion] = useState<Region>('서울');
  const [phone, setPhone] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  // 시설 정보 상태
  const [lanes, setLanes] = useState(6);
  const [length, setLength] = useState(25);
  const [hasKidsPool, setHasKidsPool] = useState(false);
  const [hasHeatedPool, setHasHeatedPool] = useState(false);
  const [hasWalkingLane, setHasWalkingLane] = useState(false);
  const [extraFeatures, setExtraFeatures] = useState('');

  // 휴무일 설정
  const [regularHolidayEnabled, setRegularHolidayEnabled] = useState(true);
  const [specificHolidayEnabled, setSpecificHolidayEnabled] = useState(false);
  const [publicHolidayEnabled, setPublicHolidayEnabled] = useState(true);
  const [temporaryHolidayEnabled, setTemporaryHolidayEnabled] = useState(false);
  const [holidayRules, setHolidayRules] = useState<HolidayRule[]>([{ type: 'WEEKLY', weekNumber: 0, dayOfWeek: 1 }]);

  // 시간 및 요금 상태
  const [schedules, setSchedules] = useState<FreeSwimSchedule[]>([]);
  const [fees, setFees] = useState<FeeInfo[]>([]);

  // 초기 데이터 설정 및 임시 저장 확인
  useEffect(() => {
    if (initialData) {
      applyData(initialData);
    } else {
      const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (draft) setHasDraft(true);
      
      setSchedules([{ day: '평일(월-금)', startTime: '09:00', endTime: '18:00' }]);
      setFees([{ type: 'adult', category: '평일', price: 5000 }]);
    }
  }, [initialData]);

  // 실시간 임시 저장 (자동 저장)
  useEffect(() => {
    if (isEditMode || isSubmitting) return;
    
    const timer = setTimeout(() => {
      const draftData = {
        name, address, region, phone, imageUrl, lanes, length, hasKidsPool, hasHeatedPool, hasWalkingLane, extraFeatures, schedules, fees, holidayRules, selectedCoords
      };
      if (name || address) {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [name, address, region, phone, imageUrl, lanes, length, hasKidsPool, hasHeatedPool, hasWalkingLane, extraFeatures, schedules, fees, holidayRules, selectedCoords, isEditMode, isSubmitting]);

  const applyData = (data: any) => {
    setName(data.name || '');
    setAddress(data.address || '');
    setRegion(data.region as Region || '서울');
    setPhone(data.phone || '');
    setImageUrl(data.imageUrl || '');
    setLanes(data.lanes || 6);
    setLength(data.length || 25);
    setHasKidsPool(data.hasKidsPool || false);
    setHasHeatedPool(data.hasHeatedPool || false);
    setHasWalkingLane(data.hasWalkingLane || false);
    setExtraFeatures(data.extraFeatures || '');
    setSchedules(data.freeSwimSchedule || data.schedules || []);
    setFees(data.fees || []);
    setSelectedCoords(data.selectedCoords || (data.lat ? {lat: data.lat, lng: data.lng} : null));

    if (data.holidayOptions) {
      setRegularHolidayEnabled(data.holidayOptions.regularHolidayEnabled);
      setHolidayRules(data.holidayOptions.rules || []);
    } else if (data.holidayRules) {
      setHolidayRules(data.holidayRules);
    }
  };

  const loadDraft = () => {
    const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (draft) {
      applyData(JSON.parse(draft));
      setHasDraft(false);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setHasDraft(false);
  };

  // Google Maps 검색 핸들러
  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      let userLoc;
      try {
        const pos: any = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
        userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch (e) {
        console.warn("Geolocation access denied or timed out.");
      }

      const results = await searchLocationWithGemini(searchQuery, userLoc);
      setSearchResults(results);
      if (results.length === 0) {
          alert("AI 검색으로 정보를 찾지 못했습니다. '주소 검색' 버튼을 눌러 수동으로 입력하거나 검색어를 더 구체적으로 바꿔주세요.");
      }
    } catch (error) {
      console.error(error);
      alert("검색 중 오류가 발생했습니다. 다시 시도하거나 주소를 직접 입력해 주세요.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualAddressSearch = () => {
    if (!(window as any).daum) return alert("주소 서비스 로드 중입니다. 잠시 후 다시 시도하세요.");
    new (window as any).daum.Postcode({
      oncomplete: (data: any) => {
        setAddress(data.address);
        setName(searchQuery || data.buildingName || "새 수영장");
        // 좌표는 주소 검색 시 기본 좌표를 할당하고 사용자가 핀을 옮길 수 있게 해야 하지만, 
        // 여기서는 기본 위치로 설정함.
        setSelectedCoords({ lat: 37.5665, lng: 126.9780 });
        
        const province = data.sido;
        const matchedRegion = REGIONS.find(r => province.includes(r));
        if (matchedRegion) setRegion(matchedRegion as Region);
      }
    }).open();
  };

  const handleSelectLocation = (result: MapSearchResult) => {
    setName(result.name);
    setAddress(result.address);
    setSelectedCoords({ lat: result.lat, lng: result.lng });
    
    const matchedRegion = REGIONS.find(r => result.address.includes(r));
    if (matchedRegion && matchedRegion !== "전체") {
        setRegion(matchedRegion as Region);
    }
    
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !selectedCoords) {
      alert("수영장 정보를 완성해 주세요. (AI 검색 또는 주소 검색을 통해 위치를 지정해야 합니다)");
      return;
    }

    setIsSubmitting(true);

    const rulesSummary = holidayRules
        .filter(() => regularHolidayEnabled)
        .map(r => `${r.weekNumber === 0 ? '매주' : `매월 ${r.weekNumber}번째`} ${WEEK_DAYS[r.dayOfWeek]}`)
        .join(', ');
    
    const pool: Pool = {
      id: initialData ? initialData.id : `user-pool-${Date.now()}`,
      name, address, region, phone,
      imageUrl: imageUrl.trim() || DEFAULT_POOL_IMAGE,
      lat: selectedCoords.lat, lng: selectedCoords.lng,
      lanes, length, hasKidsPool, hasHeatedPool, hasWalkingLane, extraFeatures,
      freeSwimSchedule: schedules,
      fees,
      closedDays: regularHolidayEnabled ? rulesSummary : "연중무휴",
      holidayOptions: { regularHolidayEnabled, specificHolidayEnabled, publicHolidayEnabled, temporaryHolidayEnabled, rules: holidayRules },
      reviews: initialData?.reviews || [],
    };

    clearDraft();
    onSave(pool);
  };

  const addHolidayRule = () => setHolidayRules([...holidayRules, { type: 'WEEKLY', weekNumber: 0, dayOfWeek: 1 }]);
  const removeHolidayRule = (idx: number) => setHolidayRules(holidayRules.filter((_, i) => i !== idx));
  const updateHolidayRule = (idx: number, field: keyof HolidayRule, value: any) => {
    const next = [...holidayRules];
    next[idx] = { ...next[idx], [field]: value };
    setHolidayRules(next);
  };

  const addSchedule = () => setSchedules([...schedules, { day: '평일(월-금)', startTime: '09:00', endTime: '18:00' }]);
  const removeSchedule = (idx: number) => setSchedules(schedules.filter((_, i) => i !== idx));
  const updateSchedule = (idx: number, field: keyof FreeSwimSchedule, value: string) => {
    const next = [...schedules];
    next[idx] = { ...next[idx], [field]: value as any };
    setSchedules(next);
  };

  const addFee = () => setFees([...fees, { type: 'adult', category: '평일', price: 0 }]);
  const removeFee = (idx: number) => setFees(fees.filter((_, i) => i !== idx));
  const updateFee = (idx: number, field: keyof FeeInfo, value: any) => {
    const next = [...fees];
    next[idx] = { ...next[idx], [field]: value };
    setFees(next);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {isSubmitting && (
        <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-[#2563EB] animate-spin mb-4" />
          <p className="font-bold text-slate-800 text-center px-6">정보를 안전하게 저장하고 있습니다...</p>
        </div>
      )}

      {/* Draft Notification */}
      {hasDraft && !isEditMode && (
        <div className="bg-amber-50 border-b border-amber-200 py-3 px-4 animate-in slide-in-from-top duration-500">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
              <RotateCcw className="w-4 h-4" />
              <span>작성 중이던 임시 저장 데이터가 있습니다.</span>
            </div>
            <div className="flex gap-2">
              <button onClick={clearDraft} className="text-xs text-amber-600 hover:text-amber-800 font-bold px-3 py-1.5">삭제</button>
              <button onClick={loadDraft} className="bg-amber-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">불러오기</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 py-4 px-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button type="button" onClick={onCancel} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium">
            <ArrowLeft className="w-5 h-5" />
            <span>취소</span>
          </button>
          <h2 className="text-lg font-bold text-slate-900">수영장 정보 입력</h2>
          <button 
            type="submit" form="pool-form"
            className="bg-[#2563EB] text-white px-8 py-2.5 rounded-full font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
          >
            저장
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8 pb-32">
        <form id="pool-form" onSubmit={handleSubmit} className="space-y-8">
          
          {/* Section: Google Maps Search */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <MapIcon className="w-6 h-6 text-blue-500" /> 수영장 위치 검색
            </h3>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchLocation())}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium" 
                            placeholder="수영장 명칭을 입력하세요 (예: 올림픽 수영장)" 
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button 
                          type="button"
                          onClick={handleSearchLocation}
                          className="flex-1 sm:flex-none bg-slate-800 text-white px-6 rounded-2xl font-bold hover:bg-slate-900 shadow-md transition-all flex items-center justify-center gap-2"
                      >
                          {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                          AI 검색
                      </button>
                      <button 
                          type="button"
                          onClick={handleManualAddressSearch}
                          className="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-700 px-6 rounded-2xl font-bold hover:bg-slate-50 shadow-sm transition-all flex items-center justify-center gap-2"
                      >
                          주소 검색
                      </button>
                    </div>
                </div>

                {searchResults.length > 0 && (
                    <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-xl bg-white relative z-40 max-h-80 overflow-y-auto divide-y divide-slate-50 animate-in fade-in slide-in-from-top-2">
                        {searchResults.map((result, idx) => (
                            <div key={idx} onClick={() => handleSelectLocation(result)} className="p-5 hover:bg-blue-50 cursor-pointer transition-colors group">
                                <div className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors text-base">{result.name}</div>
                                <div className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> {result.address}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {address && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-6 rounded-2xl shadow-inner animate-in zoom-in duration-300">
                        <div className="flex items-start gap-5">
                            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <div className="flex-1">
                                <div className="text-2xl font-black text-blue-900 mb-1">{name}</div>
                                <div className="text-sm text-blue-700/80 font-medium">{address}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">지역 분류</label>
                    <select value={region} onChange={e => setRegion(e.target.value as Region)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-blue-500">
                        {REGIONS.filter(r => r !== '전체').map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">문의 전화</label>
                    <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="02-123-4567" />
                </div>
            </div>
          </div>

          {/* Section: 자유수영 시간 설정 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-6 h-6 text-blue-500" /> 자유수영 시간표
                </h3>
                <button 
                    type="button" onClick={addSchedule}
                    className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-100 transition-all active:scale-95"
                >
                    <PlusCircle className="w-4 h-4" /> 시간대 추가
                </button>
            </div>

            <div className="space-y-4">
                {schedules.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-slate-400 text-sm">등록된 자유수영 시간이 없습니다. 우측 상단 '추가' 버튼을 눌러주세요.</p>
                    </div>
                ) : (
                    schedules.map((sch, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row gap-3 p-5 bg-slate-50 rounded-2xl border border-slate-100 group animate-in slide-in-from-left-2 transition-all">
                            <div className="flex-1 md:flex-[0.5] relative">
                                <select 
                                    value={sch.day} 
                                    onChange={e => updateSchedule(idx, 'day', e.target.value)}
                                    className="w-full appearance-none pl-4 pr-10 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                >
                                    <option value="평일(월-금)">평일(월-금)</option>
                                    <option value="토요일">토요일</option>
                                    <option value="일요일">일요일</option>
                                    <option value="공휴일">공휴일</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                            <div className="flex-1 flex gap-2 items-center">
                                <input 
                                    type="time" value={sch.startTime} onChange={e => updateSchedule(idx, 'startTime', e.target.value)}
                                    className="flex-1 p-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 shadow-sm"
                                />
                                <span className="text-slate-400 font-bold">~</span>
                                <input 
                                    type="time" value={sch.endTime} onChange={e => updateSchedule(idx, 'endTime', e.target.value)}
                                    className="flex-1 p-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 shadow-sm"
                                />
                                <button 
                                    type="button" onClick={() => removeSchedule(idx)}
                                    className="p-3.5 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
          </div>

          {/* Section: 이용 요금 설정 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-blue-500" /> 이용 요금 (일일입장)
                </h3>
                <button 
                    type="button" onClick={addFee}
                    className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-100 transition-all active:scale-95"
                >
                    <PlusCircle className="w-4 h-4" /> 요금 항목 추가
                </button>
            </div>

            <div className="space-y-4">
                {fees.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-slate-400 text-sm">등록된 요금 정보가 없습니다.</p>
                    </div>
                ) : (
                    fees.map((fee, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row gap-3 p-5 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-left-2">
                            <div className="flex-1 flex gap-2">
                                <div className="relative flex-1">
                                    <select 
                                        value={fee.category} onChange={e => updateFee(idx, 'category', e.target.value)}
                                        className="w-full appearance-none pl-4 pr-10 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none"
                                    >
                                        <option value="평일">평일</option>
                                        <option value="주말/공휴일">주말/공휴일</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                                <div className="relative flex-1">
                                    <select 
                                        value={fee.type} onChange={e => updateFee(idx, 'type', e.target.value)}
                                        className="w-full appearance-none pl-4 pr-10 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none"
                                    >
                                        <option value="adult">성인</option>
                                        <option value="teen">청소년</option>
                                        <option value="child">어린이</option>
                                        <option value="senior">경로</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="flex-1 flex gap-3 items-center">
                                <div className="relative flex-1">
                                    <input 
                                        type="number" value={fee.price} onChange={e => updateFee(idx, 'price', Number(e.target.value))}
                                        className="w-full pl-4 pr-10 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 shadow-sm"
                                        placeholder="요금 입력"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">원</span>
                                </div>
                                <button 
                                    type="button" onClick={() => removeFee(idx)}
                                    className="p-3.5 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
          </div>

          {/* Section: Holiday Management */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">휴무일 관리</h3>
            </div>

            <div className="divide-y divide-slate-100">
                <div className="flex flex-col sm:flex-row min-h-[140px]">
                    <div className="w-full sm:w-48 bg-slate-50/80 p-8 flex items-start sm:items-center border-r border-slate-100">
                        <span className="text-[15px] font-bold text-slate-700">정기 휴무일</span>
                    </div>
                    <div className="flex-1 p-8 space-y-6">
                        <div className="flex items-center gap-3">
                            <button 
                                type="button" 
                                onClick={() => setRegularHolidayEnabled(!regularHolidayEnabled)}
                                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${regularHolidayEnabled ? 'bg-[#3b82f6]' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${regularHolidayEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                            <span className="text-[13px] text-[#ff4d4d] font-bold">* 매주/매월 등 요일별로 지정 가능</span>
                        </div>
                        
                        {regularHolidayEnabled && (
                            <div className="space-y-4">
                                {holidayRules.map((rule, idx) => (
                                    <div key={idx} className="flex flex-wrap gap-2 items-center">
                                        <div className="relative min-w-[160px]">
                                            <select 
                                                value={rule.weekNumber} 
                                                onChange={e => updateHolidayRule(idx, 'weekNumber', Number(e.target.value))}
                                                className="w-full appearance-none pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 shadow-sm"
                                            >
                                                {WEEK_NUMBERS.map(wn => <option key={wn.value} value={wn.value}>{wn.label}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                        <div className="relative min-w-[160px]">
                                            <select 
                                                value={rule.dayOfWeek} 
                                                onChange={e => updateHolidayRule(idx, 'dayOfWeek', Number(e.target.value))}
                                                className="w-full appearance-none pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 shadow-sm"
                                            >
                                                {WEEK_DAYS.map((day, dIdx) => <option key={dIdx} value={dIdx}>{day}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => removeHolidayRule(idx)}
                                            className="px-5 py-3 text-[#ff4d4d] hover:bg-red-50 rounded-xl transition-colors border border-red-200 flex items-center gap-2 bg-white shadow-sm"
                                        >
                                            <Trash2 className="w-4 h-4" /> <span className="text-xs font-bold">삭제</span>
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    type="button" onClick={addHolidayRule}
                                    className="px-6 py-3 bg-white border-2 border-dashed border-blue-200 rounded-xl text-blue-600 text-sm font-bold hover:bg-blue-50 transition-colors inline-flex items-center gap-2 shadow-sm"
                                >
                                    <Plus className="w-4 h-4" /> 정기 휴무일 추가
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Specific/Public/Temporary Holidays */}
                <div className="flex flex-col sm:flex-row min-h-[80px]">
                    <div className="w-full sm:w-48 bg-slate-50/80 p-8 flex items-center border-r border-slate-100">
                        <span className="text-[15px] font-bold text-slate-700">공휴일 / 기타</span>
                    </div>
                    <div className="flex-1 p-8 flex flex-wrap gap-8 items-center">
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={() => setPublicHolidayEnabled(!publicHolidayEnabled)} className={`relative w-12 h-6 rounded-full transition-colors ${publicHolidayEnabled ? 'bg-[#3b82f6]' : 'bg-slate-300'}`}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${publicHolidayEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div></button>
                            <span className="text-sm font-bold text-slate-600">공휴일 휴무</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={() => setTemporaryHolidayEnabled(!temporaryHolidayEnabled)} className={`relative w-12 h-6 rounded-full transition-colors ${temporaryHolidayEnabled ? 'bg-[#3b82f6]' : 'bg-slate-300'}`}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${temporaryHolidayEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div></button>
                            <span className="text-sm font-bold text-slate-600">임시 공휴일 휴무</span>
                        </div>
                    </div>
                </div>
            </div>
          </div>

          {/* Section: Additional Details */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-4">
                <Clock className="w-6 h-6 text-blue-500" /> 운영 및 시설 상세
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">레인 설정</h4>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-400 mb-2 ml-1">레인 수</label>
                            <input type="number" value={lanes} onChange={e => setLanes(Number(e.target.value))} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:bg-white transition-all" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-400 mb-2 ml-1">레인 길이(m)</label>
                            <input type="number" value={length} onChange={e => setLength(Number(e.target.value))} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:bg-white transition-all" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">대표 이미지</h4>
                    <div className="relative">
                        <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm" placeholder="https://..." />
                        <ImageIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${hasKidsPool ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm font-bold' : 'bg-slate-50 border-slate-100 text-slate-400 font-medium'}`}>
                            <input type="checkbox" checked={hasKidsPool} onChange={e => setHasKidsPool(e.target.checked)} className="w-4 h-4" />
                            <span className="text-xs">유아풀</span>
                        </label>
                        <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${hasHeatedPool ? 'bg-orange-50 border-orange-200 text-orange-700 shadow-sm font-bold' : 'bg-slate-50 border-slate-100 text-slate-400 font-medium'}`}>
                            <input type="checkbox" checked={hasHeatedPool} onChange={e => setHasHeatedPool(e.target.checked)} className="w-4 h-4" />
                            <span className="text-xs">온수풀</span>
                        </label>
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-3 ml-1">기타 안내 및 꿀팁</label>
                <textarea 
                    value={extraFeatures} onChange={e => setExtraFeatures(e.target.value)} 
                    className="w-full p-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] text-sm leading-relaxed focus:bg-white transition-all" 
                    placeholder="오리발 사용 시간, 주차 정산 팁 등 다른 수영인들에게 도움이 될 정보를 적어주세요."
                />
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default PoolFormPage;
