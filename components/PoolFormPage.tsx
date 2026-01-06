
import React, { useState, useEffect } from 'react';
import { Save, MapPin, Clock, DollarSign, ArrowLeft, Loader2, Search, CheckCircle2, ChevronDown, Map as MapIcon, Info, PlusCircle, RotateCcw, Trash2, Calendar, Waves, Thermometer, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Pool, FreeSwimSchedule, FeeInfo, Region, HolidayRule } from '../types';
import { REGIONS } from '../constants';
import { searchLocationWithGemini, getCoordinatesFromAddress, MapSearchResult } from '../services/geminiService';

interface PoolFormPageProps {
  onSave: (pool: Pool) => void;
  onCancel: () => void;
  initialData?: Pool;
}

const DEFAULT_POOL_IMAGE = "https://images.unsplash.com/photo-1519315530759-39149795460a?auto=format&fit=crop&q=80&w=800";
const DRAFT_STORAGE_KEY = 'pool_form_draft_v2';

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

  // 휴무일 설정 상태
  const [regularHolidayEnabled, setRegularHolidayEnabled] = useState(true);
  const [publicHolidayEnabled, setPublicHolidayEnabled] = useState(true);
  const [temporaryHolidayEnabled, setTemporaryHolidayEnabled] = useState(false);
  const [holidayRules, setHolidayRules] = useState<HolidayRule[]>([{ type: 'WEEKLY', weekNumber: 0, dayOfWeek: 1 }]);

  // 시간 및 요금 상태
  const [schedules, setSchedules] = useState<FreeSwimSchedule[]>([]);
  const [fees, setFees] = useState<FeeInfo[]>([]);

  useEffect(() => {
    if (initialData) {
      applyData(initialData);
    } else {
      const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (draft) setHasDraft(true);
      
      setSchedules([{ day: '평일(월-금)', startTime: '09:00', endTime: '18:00' }]);
      setFees([{ type: 'adult', category: '전체', price: 5000 }]);
    }
  }, [initialData]);

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
      setPublicHolidayEnabled(data.holidayOptions.publicHolidayEnabled);
      setTemporaryHolidayEnabled(data.holidayOptions.temporaryHolidayEnabled);
      setHolidayRules(data.holidayOptions.rules || []);
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

  // 장소명으로 검색 (Gemini AI 활용)
  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      let userLoc;
      try {
        const pos: any = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 2000 }));
        userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch (e) {}

      const results = await searchLocationWithGemini(searchQuery, userLoc);
      setSearchResults(results);
      if (results.length === 0) {
          alert("검색 결과가 없습니다. 정확한 수영장 이름으로 다시 검색해 주세요.");
      }
    } catch (error) {
      console.error(error);
      alert("검색 중 오류가 발생했습니다.");
    } finally {
      setIsSearching(false);
    }
  };

  // 주소로 검색 (Daum Postcode 활용)
  const handleManualAddressSearch = () => {
    if (!(window as any).daum) return alert("주소 서비스 로드 중입니다.");
    new (window as any).daum.Postcode({
      oncomplete: async (data: any) => {
        const fullAddr = data.address;
        setAddress(fullAddr);
        setName(searchQuery || data.buildingName || "새 수영장");
        
        setIsSearching(true);
        const coords = await getCoordinatesFromAddress(fullAddr);
        if (coords) setSelectedCoords(coords);
        else setSelectedCoords({ lat: 37.5665, lng: 126.9780 });
        setIsSearching(false);

        const matchedRegion = REGIONS.find(r => data.sido.includes(r));
        if (matchedRegion) setRegion(matchedRegion as Region);
      }
    }).open();
  };

  const handleSelectLocation = (result: MapSearchResult) => {
    setName(result.name);
    setAddress(result.address);
    setSelectedCoords({ lat: result.lat, lng: result.lng });
    const matchedRegion = REGIONS.find(r => result.address.includes(r));
    if (matchedRegion && matchedRegion !== "전체") setRegion(matchedRegion as Region);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !selectedCoords) {
      alert("수영장 위치 정보를 먼저 설정해 주세요.");
      return;
    }

    setIsSubmitting(true);
    
    // 휴무일 요약 텍스트 생성
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
      holidayOptions: { 
        regularHolidayEnabled, 
        specificHolidayEnabled: false, 
        publicHolidayEnabled, 
        temporaryHolidayEnabled, 
        rules: holidayRules 
      },
      reviews: initialData?.reviews || [],
    };

    clearDraft();
    onSave(pool);
  };

  // 시간표 제어
  const addSchedule = () => setSchedules([...schedules, { day: '평일(월-금)', startTime: '09:00', endTime: '18:00' }]);
  const removeSchedule = (idx: number) => setSchedules(schedules.filter((_, i) => i !== idx));
  const updateSchedule = (idx: number, field: keyof FreeSwimSchedule, value: string) => {
    const next = [...schedules];
    next[idx] = { ...next[idx], [field]: value as any };
    setSchedules(next);
  };

  // 요금 제어
  const addFee = () => setFees([...fees, { type: 'adult', category: '전체', price: 0 }]);
  const removeFee = (idx: number) => setFees(fees.filter((_, i) => i !== idx));
  const updateFee = (idx: number, field: keyof FeeInfo, value: any) => {
    const next = [...fees];
    next[idx] = { ...next[idx], [field]: value };
    setFees(next);
  };

  // 휴무 규칙 제어
  const addHolidayRule = () => setHolidayRules([...holidayRules, { type: 'WEEKLY', weekNumber: 0, dayOfWeek: 1 }]);
  const removeHolidayRule = (idx: number) => setHolidayRules(holidayRules.filter((_, i) => i !== idx));
  const updateHolidayRule = (idx: number, field: keyof HolidayRule, value: any) => {
    const next = [...holidayRules];
    next[idx] = { ...next[idx], [field]: value };
    setHolidayRules(next);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {(isSubmitting || isSearching) && (
        <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
          <p className="font-bold text-slate-800 text-center px-6">AI가 최적의 장소 정보를 분석하고 있습니다...</p>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200 py-4 px-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button type="button" onClick={onCancel} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium">
            <ArrowLeft className="w-5 h-5" />
            <span>취소</span>
          </button>
          <h2 className="text-lg font-bold text-slate-900">{isEditMode ? '수영장 정보 수정' : '새 수영장 등록'}</h2>
          <button type="submit" form="pool-form-page" className="bg-brand-600 text-white px-8 py-2.5 rounded-full font-bold shadow-lg hover:bg-brand-700 active:scale-95 transition-all">저장하기</button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8 pb-32">
        {hasDraft && !isEditMode && (
          <div className="mb-8 bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-4">
             <div className="flex items-center gap-3 text-amber-800 font-medium">
                <RotateCcw className="w-5 h-5" />
                <span>작성 중이던 데이터가 있습니다.</span>
             </div>
             <div className="flex gap-2">
                <button onClick={clearDraft} className="text-sm text-amber-600 font-bold px-3 py-1">삭제</button>
                <button onClick={loadDraft} className="bg-amber-500 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-sm">불러오기</button>
             </div>
          </div>
        )}

        <form id="pool-form-page" onSubmit={handleSubmit} className="space-y-8">
          
          {/* 장소 검색 섹션 */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <MapIcon className="w-6 h-6 text-brand-500" /> 수영장 위치 찾기
            </h3>
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchLocation())}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all font-medium" 
                            placeholder="수영장 이름을 입력하세요 (예: 올림픽수영장)" 
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button type="button" onClick={handleSearchLocation} className="flex-1 sm:flex-none bg-slate-900 text-white px-8 rounded-2xl font-bold hover:bg-black transition-all">장소명 검색</button>
                      <button type="button" onClick={handleManualAddressSearch} className="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-700 px-8 rounded-2xl font-bold">주소 입력</button>
                    </div>
                </div>

                {searchResults.length > 0 && (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xl bg-white relative z-40 max-h-80 overflow-y-auto divide-y divide-slate-100">
                        {searchResults.map((result, idx) => (
                            <div key={idx} onClick={() => handleSelectLocation(result)} className="p-5 hover:bg-brand-50 cursor-pointer transition-colors group">
                                <div className="font-bold text-slate-800 group-hover:text-brand-600 text-base">{result.name}</div>
                                <div className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-300" /> {result.address}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {address && (
                    <div className="bg-brand-50 border border-brand-100 p-6 rounded-2xl shadow-inner flex items-start gap-5">
                        <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div className="flex-1">
                            <div className="text-2xl font-black text-brand-900 mb-1">{name}</div>
                            <div className="text-sm text-brand-700/80 font-medium">{address}</div>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">지역 분류</label>
                    <select value={region} onChange={e => setRegion(e.target.value as Region)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold">
                        {REGIONS.filter(r => r !== '전체').map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">문의 전화</label>
                    <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" placeholder="02-123-4567" />
                </div>
            </div>
          </div>

          {/* 시간표 섹션 */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-6 h-6 text-brand-500" /> 자유수영 시간표
                </h3>
                <button type="button" onClick={addSchedule} className="flex items-center gap-1.5 bg-brand-50 text-brand-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-brand-100 transition-colors">
                    <PlusCircle className="w-4 h-4" /> 시간대 추가
                </button>
            </div>
            <div className="space-y-4">
                {schedules.map((sch, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row gap-3 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex-1 md:flex-[0.5] relative">
                            <select value={sch.day} onChange={e => updateSchedule(idx, 'day', e.target.value)} className="w-full pl-4 pr-10 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none appearance-none">
                                <option value="평일(월-금)">평일(월-금)</option>
                                <option value="토요일">토요일</option>
                                <option value="일요일">일요일</option>
                                <option value="공휴일">공휴일</option>
                                <option value="주말/공휴일">주말/공휴일</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="flex-1 flex gap-2 items-center">
                            <input type="time" value={sch.startTime} onChange={e => updateSchedule(idx, 'startTime', e.target.value)} className="flex-1 p-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm" />
                            <span className="text-slate-400 font-bold px-1">~</span>
                            <input type="time" value={sch.endTime} onChange={e => updateSchedule(idx, 'endTime', e.target.value)} className="flex-1 p-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm" />
                            <button type="button" onClick={() => removeSchedule(idx)} className="p-3.5 text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                        </div>
                    </div>
                ))}
            </div>
          </div>

          {/* 요금 섹션 */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-brand-500" /> 이용 요금
                </h3>
                <button type="button" onClick={addFee} className="flex items-center gap-1.5 bg-brand-50 text-brand-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-brand-100 transition-colors">
                    <PlusCircle className="w-4 h-4" /> 요금 항목 추가
                </button>
            </div>
            <div className="space-y-4">
                {fees.map((fee, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row gap-3 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex-1 flex gap-2">
                            <select value={fee.category} onChange={e => updateFee(idx, 'category', e.target.value)} className="flex-1 p-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none">
                                <option value="전체">전체 (요일 무관)</option>
                                <option value="평일">평일</option>
                                <option value="주말/공휴일">주말/공휴일</option>
                            </select>
                            <select value={fee.type} onChange={e => updateFee(idx, 'type', e.target.value)} className="flex-1 p-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none">
                                <option value="adult">성인</option>
                                <option value="teen">청소년</option>
                                <option value="child">어린이</option>
                                <option value="senior">경로</option>
                            </select>
                        </div>
                        <div className="flex-1 flex gap-3 items-center">
                            <div className="relative flex-1">
                                <input type="number" value={fee.price} onChange={e => updateFee(idx, 'price', Number(e.target.value))} className="w-full p-3.5 pr-10 bg-white border border-slate-200 rounded-xl text-sm font-bold" placeholder="요금 입력" />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">원</span>
                            </div>
                            <button type="button" onClick={() => removeFee(idx)} className="p-3.5 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 className="w-5 h-5" /></button>
                        </div>
                    </div>
                ))}
            </div>
          </div>

          {/* 휴무일 상세 관리 섹션 (복구) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-500" /> 휴무일 상세 관리
              </h3>
            </div>
            <div className="p-8 space-y-8">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center text-brand-600">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-800">정기 휴무일</div>
                                <div className="text-xs text-slate-500">매주 또는 매월 특정일 휴무 여부</div>
                            </div>
                        </div>
                        <button type="button" onClick={() => setRegularHolidayEnabled(!regularHolidayEnabled)} className={`relative w-14 h-7 rounded-full transition-colors ${regularHolidayEnabled ? 'bg-brand-600' : 'bg-slate-300'}`}>
                            <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${regularHolidayEnabled ? 'translate-x-7' : 'translate-x-0'}`}></div>
                        </button>
                    </div>

                    {regularHolidayEnabled && (
                        <div className="pl-4 space-y-4 animate-in slide-in-from-left-2 duration-300">
                            {holidayRules.map((rule, idx) => (
                                <div key={idx} className="flex flex-wrap gap-2 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                    <select value={rule.weekNumber} onChange={e => updateHolidayRule(idx, 'weekNumber', Number(e.target.value))} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none">
                                        {WEEK_NUMBERS.map(wn => <option key={wn.value} value={wn.value}>{wn.label}</option>)}
                                    </select>
                                    <select value={rule.dayOfWeek} onChange={e => updateHolidayRule(idx, 'dayOfWeek', Number(e.target.value))} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none">
                                        {WEEK_DAYS.map((day, dIdx) => <option key={dIdx} value={dIdx}>{day}</option>)}
                                    </select>
                                    <button type="button" onClick={() => removeHolidayRule(idx)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg ml-auto"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                            <button type="button" onClick={addHolidayRule} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-bold hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50 transition-all">+ 정기 휴무 규칙 추가</button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div onClick={() => setPublicHolidayEnabled(!publicHolidayEnabled)} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${publicHolidayEnabled ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                            <AlertCircle className={`w-5 h-5 ${publicHolidayEnabled ? 'text-red-500' : 'text-slate-300'}`} />
                            <span className="font-bold text-sm">법정 공휴일 휴무</span>
                        </div>
                        <div onClick={() => setTemporaryHolidayEnabled(!temporaryHolidayEnabled)} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${temporaryHolidayEnabled ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                            <AlertCircle className={`w-5 h-5 ${temporaryHolidayEnabled ? 'text-amber-500' : 'text-slate-300'}`} />
                            <span className="font-bold text-sm">임시 공휴일 휴무</span>
                        </div>
                    </div>
                </div>
            </div>
          </div>

          {/* 시설 정보 섹션 (복구) */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-4">
                <Info className="w-6 h-6 text-brand-500" /> 시설 및 레인 정보
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">레인 및 수영장 규모</label>
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <input type="number" value={lanes} onChange={e => setLanes(Number(e.target.value))} className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:bg-white transition-all" placeholder="레인 수" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">레인</span>
                        </div>
                        <div className="relative flex-1">
                            <input type="number" value={length} onChange={e => setLength(Number(e.target.value))} className="w-full p-4 pr-10 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:bg-white transition-all" placeholder="길이" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">m</span>
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">이미지 URL</label>
                    <div className="relative">
                        <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm" placeholder="수영장 사진 URL을 입력하세요" />
                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">보유 시설 체크</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button type="button" onClick={() => setHasKidsPool(!hasKidsPool)} className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 font-bold text-sm ${hasKidsPool ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                        <CheckCircle2 className="w-4 h-4" /> 유아풀 보유
                    </button>
                    <button type="button" onClick={() => setHasHeatedPool(!hasHeatedPool)} className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 font-bold text-sm ${hasHeatedPool ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                        <Thermometer className="w-4 h-4" /> 온수풀(따뜻함)
                    </button>
                    <button type="button" onClick={() => setHasWalkingLane(!hasWalkingLane)} className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 font-bold text-sm ${hasWalkingLane ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                        <Waves className="w-4 h-4" /> 걷기 전용 레인
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-3 ml-1">기타 안내 및 꿀팁 (공동 운영 정보)</label>
                <textarea 
                    value={extraFeatures} 
                    onChange={e => setExtraFeatures(e.target.value)} 
                    className="w-full p-6 bg-slate-50 border border-slate-200 rounded-3xl outline-none min-h-[160px] text-sm leading-relaxed focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all" 
                    placeholder="오리발 사용 가능 시간, 주차 팁, 드라이기 유무 등 사용자들에게 도움이 될 생생한 정보를 입력해주세요." 
                />
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default PoolFormPage;
