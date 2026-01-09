
import React, { useState, useEffect } from 'react';
import { Save, MapPin, Clock, DollarSign, ArrowLeft, Loader2, Search, CheckCircle2, ChevronDown, Map as MapIcon, Info, PlusCircle, RotateCcw, Trash2, Calendar, Waves, Thermometer, AlertCircle, ImageIcon, Globe } from 'lucide-react';
import { Pool, FreeSwimSchedule, FeeInfo, Region, HolidayRule } from '../types';
import { REGIONS } from '../constants';
import { searchLocationWithGemini, getCoordinatesFromAddress, MapSearchResult } from '../services/geminiService';

interface PoolFormPageProps {
  onSave: (pool: Pool) => void;
  onCancel: () => void;
  initialData?: Pool;
}

const DEFAULT_POOL_IMAGE = "https://images.unsplash.com/photo-1519315530759-39149795460a?auto=format&fit=crop&q=80&w=800";
const WEEK_DAYS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
const DAY_SHORT_NAMES = ["월", "화", "수", "목", "금", "토", "일"];
const WEEK_NUMBER_OPTIONS = [
  { label: "매주", value: 0 },
  { label: "1주", value: 1 },
  { label: "2주", value: 2 },
  { label: "3주", value: 3 },
  { label: "4주", value: 4 },
  { label: "5주", value: 5 },
];

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
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MapSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, lng: number} | null>(initialData ? {lat: initialData.lat, lng: initialData.lng} : null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [region, setRegion] = useState<Region>('서울');
  const [phone, setPhone] = useState('');
  const [homepageUrl, setHomepageUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  const [lanes, setLanes] = useState(6);
  const [length, setLength] = useState(25);
  const [hasKidsPool, setHasKidsPool] = useState(false);
  const [hasHeatedPool, setHasHeatedPool] = useState(false);
  const [hasWalkingLane, setHasWalkingLane] = useState(false);
  const [extraFeatures, setExtraFeatures] = useState('');

  const [regularHolidayEnabled, setRegularHolidayEnabled] = useState(true);
  const [publicHolidayEnabled, setPublicHolidayEnabled] = useState(true);
  const [temporaryHolidayEnabled, setTemporaryHolidayEnabled] = useState(false);
  const [holidayRules, setHolidayRules] = useState<HolidayRule[]>([{ type: 'WEEKLY', weekNumber: 0, dayOfWeek: 1 }]);

  const [schedules, setSchedules] = useState<FreeSwimSchedule[]>([]);
  const [fees, setFees] = useState<FeeInfo[]>([]);

  useEffect(() => {
    if (initialData) {
      applyData(initialData);
    } else {
      setSchedules([{ day: '', startTime: '09:00', endTime: '18:00', weeks: [0] }]);
      setFees([{ type: 'adult', category: '전체', price: 5000 }]);
    }
  }, [initialData]);

  const applyData = (data: Pool) => {
    setName(data.name || '');
    setAddress(data.address || '');
    setRegion(data.region as Region || '서울');
    setPhone(data.phone || '');
    setHomepageUrl(data.homepageUrl || '');
    setImageUrl(data.imageUrl || '');
    setLanes(data.lanes || 6);
    setLength(data.length || 25);
    setHasKidsPool(data.hasKidsPool || false);
    setHasHeatedPool(data.hasHeatedPool || false);
    setHasWalkingLane(data.hasWalkingLane || false);
    setExtraFeatures(data.extraFeatures || '');
    
    // 요일 데이터 전처리: "평일(월-금)" 등을 실제 요일 배열로 변환하여 보존
    const processedSchedules = (data.freeSwimSchedule || []).map(s => {
      let dayStr = s.day;
      if (dayStr === "평일(월-금)") dayStr = "월, 화, 수, 목, 금";
      if (dayStr === "주말/공휴일") dayStr = "토, 일";
      return { ...s, day: dayStr };
    });
    setSchedules(processedSchedules);
    
    setFees(data.fees || []);
    setSelectedCoords(data.lat ? {lat: data.lat, lng: data.lng} : null);

    if (data.holidayOptions) {
      setRegularHolidayEnabled(data.holidayOptions.regularHolidayEnabled);
      setPublicHolidayEnabled(data.holidayOptions.publicHolidayEnabled);
      setTemporaryHolidayEnabled(data.holidayOptions.temporaryHolidayEnabled);
      setHolidayRules(data.holidayOptions.rules || []);
    }
  };

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
    } catch (error) {
      console.error(error);
      alert("검색 중 오류가 발생했습니다.");
    } finally {
      setIsSearching(false);
    }
  };

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
      alert("수영장 위치 정보(이름, 주소)를 설정해 주세요.");
      return;
    }

    const invalidSchedule = schedules.find(s => !s.day.trim());
    if (invalidSchedule) {
      alert("자유수영 시간표의 모든 항목에 대해 최소 하나 이상의 요일을 선택해 주세요.");
      return;
    }

    setIsSubmitting(true);
    
    const rulesSummary = holidayRules
        .filter(() => regularHolidayEnabled)
        .map(r => `${r.weekNumber === 0 ? '매주' : `매월 ${r.weekNumber}번째`} ${WEEK_DAYS[r.dayOfWeek]}`)
        .join(', ');
    
    const pool: Pool = {
      id: initialData ? initialData.id : `user-pool-${Date.now()}`,
      name, address, region, phone, homepageUrl,
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

    onSave(pool);
  };

  const addSchedule = () => setSchedules([...schedules, { day: '', startTime: '09:00', endTime: '18:00', weeks: [0] }]);
  const removeSchedule = (idx: number) => setSchedules(schedules.filter((_, i) => i !== idx));
  
  const toggleDayInSchedule = (idx: number, dayName: string) => {
    const next = [...schedules];
    let currentDays = next[idx].day.split(', ').filter(d => d.trim() !== "");

    if (currentDays.includes(dayName)) {
      currentDays = currentDays.filter(d => d !== dayName);
    } else {
      currentDays.push(dayName);
    }
    
    currentDays.sort((a, b) => DAY_SHORT_NAMES.indexOf(a) - DAY_SHORT_NAMES.indexOf(b));
    next[idx] = { ...next[idx], day: currentDays.join(', ') };
    setSchedules(next);
  };

  const toggleWeekInSchedule = (idx: number, weekNum: number) => {
    const next = [...schedules];
    let currentWeeks = next[idx].weeks || [0];
    
    if (weekNum === 0) {
      currentWeeks = [0];
    } else {
      if (currentWeeks.includes(0)) currentWeeks = [];
      if (currentWeeks.includes(weekNum)) {
        currentWeeks = currentWeeks.filter(w => w !== weekNum);
        if (currentWeeks.length === 0) currentWeeks = [0];
      } else {
        currentWeeks.push(weekNum);
      }
      currentWeeks.sort((a, b) => a - b);
    }
    
    next[idx] = { ...next[idx], weeks: currentWeeks };
    setSchedules(next);
  };

  const updateSchedule = (idx: number, field: keyof FreeSwimSchedule, value: string) => {
    const next = [...schedules];
    next[idx] = { ...next[idx], [field]: value as any };
    setSchedules(next);
  };

  const addFee = () => setFees([...fees, { type: 'adult', category: '전체', price: 0 }]);
  const removeFee = (idx: number) => setFees(fees.filter((_, i) => i !== idx));
  const updateFee = (idx: number, field: keyof FeeInfo, value: any) => {
    const next = [...fees];
    next[idx] = { ...next[idx], [field]: value };
    setFees(next);
  };

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
          <p className="font-bold text-slate-800 text-center px-6">정보를 처리하고 있습니다...</p>
        </div>
      )}

      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 py-4 px-4 sticky top-16 sm:top-20 z-40 shadow-sm transition-all">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button type="button" onClick={onCancel} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>취소</span>
          </button>
          <h2 className="text-lg font-black text-slate-900">{isEditMode ? '수영장 정보 수정' : '수영장 등록'}</h2>
          <button type="submit" form="pool-form-page" className="bg-brand-600 text-white px-8 py-2.5 rounded-full font-black shadow-lg hover:bg-brand-700 active:scale-95 transition-all">저장하기</button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8 pb-32">
        <form id="pool-form-page" onSubmit={handleSubmit} className="space-y-8">
          
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
                    <div className="flex gap-2">
                      <button type="button" onClick={handleSearchLocation} className="flex-1 sm:flex-none bg-slate-900 text-white px-8 rounded-2xl font-bold hover:bg-black transition-all">AI 검색</button>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">공식 홈페이지</label>
                    <div className="relative">
                        <input type="url" value={homepageUrl} onChange={e => setHomepageUrl(e.target.value)} className="w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" placeholder="https://www.example.com" />
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    </div>
                </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-6 h-6 text-brand-500" /> 자유수영 시간표
                </h3>
            </div>
            <div className="space-y-8">
                {schedules.map((sch, idx) => (
                    <div key={idx} className="p-8 bg-slate-50 rounded-[40px] border border-slate-100 space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4">
                           <button type="button" onClick={() => removeSchedule(idx)} className="text-slate-300 hover:text-red-500 transition-colors p-2 bg-white rounded-full shadow-sm border border-slate-100">
                              <Trash2 size={18} />
                           </button>
                        </div>

                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">1. 운영 주차 선택 (매주 기본)</label>
                           <div className="flex flex-wrap gap-2">
                              {WEEK_NUMBER_OPTIONS.map(opt => {
                                const isActive = (sch.weeks || [0]).includes(opt.value);
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => toggleWeekInSchedule(idx, opt.value)}
                                    className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all border-2 shadow-sm ${
                                      isActive 
                                        ? 'bg-slate-900 border-slate-900 text-white' 
                                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                           </div>
                        </div>
                        
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">2. 운영 요일 선택 (필수)</label>
                           <div className="flex flex-wrap gap-2">
                              {DAY_SHORT_NAMES.map(dayName => {
                                const isActive = sch.day.split(', ').includes(dayName);
                                return (
                                  <button
                                    key={dayName}
                                    type="button"
                                    onClick={() => toggleDayInSchedule(idx, dayName)}
                                    className={`w-11 h-11 rounded-2xl text-base font-black transition-all border-2 shadow-sm ${
                                      isActive 
                                        ? 'bg-brand-600 border-brand-600 text-white' 
                                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                                    }`}
                                  >
                                    {dayName}
                                  </button>
                                );
                              })}
                           </div>
                           {!sch.day && <p className="text-[10px] text-red-400 font-bold ml-1">* 요일을 선택해 주세요.</p>}
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">3. 운영 시간 입력</label>
                            <div className="flex gap-3 items-center">
                                <div className="flex-1 relative group">
                                    <input type="time" value={sch.startTime} onChange={e => updateSchedule(idx, 'startTime', e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-base font-black outline-none focus:ring-2 focus:ring-brand-500" />
                                </div>
                                <div className="text-slate-300 font-bold">~</div>
                                <div className="flex-1 relative group">
                                    <input type="time" value={sch.endTime} onChange={e => updateSchedule(idx, 'endTime', e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-base font-black outline-none focus:ring-2 focus:ring-brand-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <button type="button" onClick={addSchedule} className="w-full flex items-center justify-center gap-2 bg-brand-50 text-brand-600 py-4 rounded-3xl text-base font-black border-2 border-dashed border-brand-100 hover:bg-brand-100 transition-all">
                <PlusCircle className="w-5 h-5" /> 시간표 항목 추가하기
            </button>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-brand-500" /> 이용 요금
                </h3>
                <button type="button" onClick={addFee} className="flex items-center gap-1.5 bg-brand-50 text-brand-600 px-4 py-2 rounded-xl text-sm font-bold">
                    <PlusCircle className="w-4 h-4" /> 추가
                </button>
            </div>
            <div className="space-y-4">
                {fees.map((fee, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row gap-3 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex-1 flex gap-2">
                            <select value={fee.category} onChange={e => updateFee(idx, 'category', e.target.value as any)} className="flex-1 p-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none">
                                <option value="전체">전체 (요일 무관)</option>
                                <option value="평일">평일</option>
                                <option value="주말/공휴일">주말/공휴일</option>
                            </select>
                            <select value={fee.type} onChange={e => updateFee(idx, 'type', e.target.value as any)} className="flex-1 p-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none">
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

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-500" /> 휴무일 및 상세 시설
              </h3>
            </div>
            <div className="p-8 space-y-10">
                <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-6 h-6 text-brand-600" />
                            <div>
                                <div className="text-sm font-bold text-slate-800">정기 휴무일</div>
                                <div className="text-xs text-slate-500">매주 또는 특정 주차 요일 휴무</div>
                            </div>
                        </div>
                        <button type="button" onClick={() => setRegularHolidayEnabled(!regularHolidayEnabled)} className={`relative w-14 h-7 rounded-full transition-colors ${regularHolidayEnabled ? 'bg-brand-600' : 'bg-slate-300'}`}>
                            <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${regularHolidayEnabled ? 'translate-x-7' : 'translate-x-0'}`}></div>
                        </button>
                    </div>

                    {regularHolidayEnabled && (
                        <div className="pl-4 space-y-3">
                            {holidayRules.map((rule, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <select value={rule.weekNumber} onChange={e => updateHolidayRule(idx, 'weekNumber', Number(e.target.value))} className="p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none">
                                        {WEEK_NUMBERS.map(wn => <option key={wn.value} value={wn.value}>{wn.label}</option>)}
                                    </select>
                                    <select value={rule.dayOfWeek} onChange={e => updateHolidayRule(idx, 'dayOfWeek', Number(e.target.value))} className="p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none">
                                        {WEEK_DAYS.map((day, dIdx) => <option key={dIdx} value={dIdx}>{day}</option>)}
                                    </select>
                                    <button type="button" onClick={() => removeHolidayRule(idx)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl ml-auto"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                            <button type="button" onClick={addHolidayRule} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm font-bold hover:border-brand-500 hover:text-brand-600">+ 정기 휴무 추가</button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div onClick={() => setPublicHolidayEnabled(!publicHolidayEnabled)} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${publicHolidayEnabled ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-bold text-sm">법정 공휴일 휴무</span>
                        </div>
                        <div onClick={() => setTemporaryHolidayEnabled(!temporaryHolidayEnabled)} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${temporaryHolidayEnabled ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-bold text-sm">임시 공휴일 휴무</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <h4 className="text-sm font-black text-slate-800 border-l-4 border-brand-600 pl-3">수영장 시설 및 레인</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">레인 수</label>
                            <input type="number" value={lanes} onChange={e => setLanes(Number(e.target.value))} className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="레인 수" />
                            <span className="absolute right-4 bottom-4 text-slate-400 text-xs font-bold">레인</span>
                        </div>
                        <div className="relative">
                            <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">레인 길이</label>
                            <input type="number" value={length} onChange={e => setLength(Number(e.target.value))} className="w-full p-4 pr-10 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="길이" />
                            <span className="absolute right-4 bottom-4 text-slate-400 text-xs font-bold">m</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button type="button" onClick={() => setHasKidsPool(!hasKidsPool)} className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 font-bold text-sm ${hasKidsPool ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                            <CheckCircle2 className="w-4 h-4" /> 유아풀
                        </button>
                        <button type="button" onClick={() => setHasHeatedPool(!hasHeatedPool)} className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 font-bold text-sm ${hasHeatedPool ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                            <Thermometer className="w-4 h-4" /> 온수풀
                        </button>
                        <button type="button" onClick={() => setHasWalkingLane(!hasWalkingLane)} className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 font-bold text-sm ${hasWalkingLane ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                            <Waves className="w-4 h-4" /> 걷기레인
                        </button>
                    </div>

                    <div className="relative">
                        <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">이미지 URL (선택)</label>
                        <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm" placeholder="수영장 사진 URL" />
                        <ImageIcon className="absolute left-4 top-1/2 translate-y-0 text-slate-400 w-5 h-5" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">공동 안내 및 꿀팁 (주차, 셔틀 등)</label>
                        <textarea value={extraFeatures} onChange={e => setExtraFeatures(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none min-h-[120px] text-sm" placeholder="주차 가능 여부, 오리발 사용 가능 시간 등 자유롭게 입력하세요." />
                    </div>
                </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default PoolFormPage;
