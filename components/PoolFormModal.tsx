
import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, MapPin, Clock, DollarSign, Search } from 'lucide-react';
import { Pool, FreeSwimSchedule, FeeInfo, Region, DayType, FeeCategory } from '../types';
import { REGIONS } from '../constants';

interface PoolFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pool: Pool) => void;
  initialData?: Pool; 
  userId: string;
}

const PoolFormModal: React.FC<PoolFormModalProps> = ({ isOpen, onClose, onSave, initialData, userId }) => {
  const isEditMode = !!initialData;
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [region, setRegion] = useState<Region>('서울');
  const [phone, setPhone] = useState('');
  const [lanes, setLanes] = useState(6);
  const [length, setLength] = useState(25);
  const [hasKidsPool, setHasKidsPool] = useState(false);
  const [hasHeatedPool, setHasHeatedPool] = useState(false);
  const [hasWalkingLane, setHasWalkingLane] = useState(false);
  const [extraFeatures, setExtraFeatures] = useState('');
  const [closedDays, setClosedDays] = useState('NONE');
  const [schedules, setSchedules] = useState<FreeSwimSchedule[]>([]);
  const [fees, setFees] = useState<FeeInfo[]>([]);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setAddress(initialData.address);
      setRegion(initialData.region as Region);
      setPhone(initialData.phone);
      setLanes(initialData.lanes);
      setLength(initialData.length);
      setHasKidsPool(initialData.hasKidsPool);
      setHasHeatedPool(initialData.hasHeatedPool || false);
      setHasWalkingLane(initialData.hasWalkingLane || false);
      setExtraFeatures(initialData.extraFeatures || '');
      setClosedDays(initialData.closedDays || 'NONE');
      setSchedules(initialData.freeSwimSchedule || []);
      setFees(initialData.fees || []);
    } else {
      setName('');
      setAddress('');
      setRegion('서울');
      setPhone('');
      setLanes(6);
      setLength(25);
      setHasKidsPool(false);
      setHasHeatedPool(false);
      setHasWalkingLane(false);
      setExtraFeatures('');
      setClosedDays('NONE');
      setSchedules([{ day: '평일(월-금)', startTime: '09:00', endTime: '18:00' }]);
      setFees([{ type: 'adult', category: '평일', price: 5000 }]);
    }
  }, [initialData, isOpen]);

  const handleAddressSearch = () => {
    if (!(window as any).daum) return;
    new (window as any).daum.Postcode({
      oncomplete: (data: any) => {
        setAddress(data.address);
        const province = data.sido;
        const matchedRegion = REGIONS.find(r => province.includes(r));
        if (matchedRegion) setRegion(matchedRegion as Region);
      }
    }).open();
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address) {
        alert("수영장 이름과 주소는 필수입니다.");
        return;
    }

    const newPool: Pool = {
        id: initialData ? initialData.id : `user-${userId}-${Date.now()}`,
        name,
        address,
        region,
        phone,
        imageUrl: initialData?.imageUrl || `https://images.unsplash.com/photo-1519315530759-39149795460a?auto=format&fit=crop&q=80&w=800`,
        lat: initialData?.lat || 37.5665, 
        lng: initialData?.lng || 126.9780,
        lanes,
        length,
        hasKidsPool,
        hasHeatedPool,
        hasWalkingLane,
        extraFeatures,
        freeSwimSchedule: schedules,
        fees,
        closedDays,
        reviews: initialData?.reviews || [],
        createdBy: initialData?.createdBy || userId,
        lastModifiedBy: userId
    };

    onSave(newPool);
    onClose();
  };

  const addSchedule = () => setSchedules([...schedules, { day: '평일(월-금)', startTime: '09:00', endTime: '18:00' }]);
  const removeSchedule = (idx: number) => setSchedules(schedules.filter((_, i) => i !== idx));
  const updateSchedule = (idx: number, field: keyof FreeSwimSchedule, value: string) => {
    const newSch = [...schedules];
    newSch[idx] = { ...newSch[idx], [field]: value as any };
    setSchedules(newSch);
  };

  const addFee = () => setFees([...fees, { type: 'adult', category: '평일', price: 0 }]);
  const removeFee = (idx: number) => setFees(fees.filter((_, i) => i !== idx));
  const updateFee = (idx: number, field: keyof FeeInfo, value: any) => {
    const newFees = [...fees];
    newFees[idx] = { ...newFees[idx], [field]: value };
    setFees(newFees);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-blue-50 shrink-0">
          <h3 className="font-bold text-blue-900 flex items-center gap-2">
            {isEditMode ? <><Save className="w-5 h-5" /> 수정하기</> : <><Plus className="w-5 h-5" /> 수영장 등록</>}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
            <form id="pool-form-modal" onSubmit={handleSubmit} className="space-y-6">
                
                <section className="space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-500" /> 기본 정보</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-600 mb-1">수영장 이름 *</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="예: 국민체육센터" required />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-600 mb-1">주소 *</label>
                            <div className="flex gap-2">
                                <input type="text" value={address} readOnly onClick={handleAddressSearch} className="flex-1 p-3 bg-white border rounded-xl outline-none cursor-pointer" placeholder="주소 검색" required />
                                <button type="button" onClick={handleAddressSearch} className="bg-slate-800 text-white px-4 rounded-xl font-bold text-sm"><Search className="w-4 h-4" /></button>
                            </div>
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">지역 분류</label>
                            <select value={region} onChange={e => setRegion(e.target.value as Region)} className="w-full p-3 bg-white border rounded-xl">
                                {REGIONS.filter(r => r !== '전체').map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">전화번호</label>
                            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-3 bg-white border rounded-xl outline-none" placeholder="02-1234-5678" />
                        </div>
                    </div>
                </section>

                <hr className="border-slate-100" />

                <section className="space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500" /> 시간 및 휴무</h4>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">정기 휴무일</label>
                        <select value={closedDays} onChange={e => setClosedDays(e.target.value)} className="w-full p-3 bg-white border rounded-xl text-sm">
                            <option value="NONE">연중무휴</option>
                            <option value="EVERY_MON">매주 월요일</option>
                            <option value="EVERY_SUN">매주 일요일</option>
                            <option value="SUN_2_4">2, 4주 일요일</option>
                            <option value="HOLIDAYS">공휴일 휴무</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-600">시간대</span><button type="button" onClick={addSchedule} className="text-[10px] text-blue-600 font-bold">+ 추가</button></div>
                        {schedules.map((sch, idx) => (
                            <div key={idx} className="flex gap-1 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <select value={sch.day} onChange={e => updateSchedule(idx, 'day', e.target.value)} className="text-xs p-1 border rounded bg-white">
                                    <option value="평일(월-금)">평일</option>
                                    <option value="토요일">토요일</option>
                                    <option value="일요일">일요일</option>
                                </select>
                                <input type="time" value={sch.startTime} onChange={e => updateSchedule(idx, 'startTime', e.target.value)} className="flex-1 p-1 text-xs border rounded" />
                                <span className="text-slate-400">~</span>
                                <input type="time" value={sch.endTime} onChange={e => updateSchedule(idx, 'endTime', e.target.value)} className="flex-1 p-1 text-xs border rounded" />
                                <button type="button" onClick={() => removeSchedule(idx)} className="text-red-400"><Trash2 className="w-3 h-3" /></button>
                            </div>
                        ))}
                    </div>
                </section>

                <hr className="border-slate-100" />

                <section className="space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2"><DollarSign className="w-4 h-4 text-blue-500" /> 요금 정보</h4>
                    <div className="space-y-2">
                        {fees.map((fee, idx) => (
                             <div key={idx} className="flex gap-1 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                 <select value={fee.category} onChange={e => updateFee(idx, 'category', e.target.value)} className="text-xs p-1 border rounded bg-white"><option value="평일">평일</option><option value="주말/공휴일">주말</option></select>
                                 <select value={fee.type} onChange={e => updateFee(idx, 'type', e.target.value)} className="text-xs p-1 border rounded bg-white"><option value="adult">성인</option><option value="teen">청소년</option><option value="child">어린이</option></select>
                                 <input type="number" value={fee.price} onChange={e => updateFee(idx, 'price', Number(e.target.value))} className="flex-1 p-1 text-xs border rounded" />
                                 <button type="button" onClick={() => removeFee(idx)} className="text-red-400"><Trash2 className="w-3 h-3" /></button>
                             </div>
                        ))}
                        <button type="button" onClick={addFee} className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400 font-bold">+ 요금 항목 추가</button>
                    </div>
                </section>

                <section className="space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm">기타 시설</h4>
                    <div className="grid grid-cols-3 gap-2">
                        <label className={`p-2 rounded-lg border text-[10px] font-bold text-center cursor-pointer ${hasKidsPool ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white text-slate-400'}`}><input type="checkbox" checked={hasKidsPool} onChange={e => setHasKidsPool(e.target.checked)} className="hidden" />유아풀</label>
                        <label className={`p-2 rounded-lg border text-[10px] font-bold text-center cursor-pointer ${hasHeatedPool ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white text-slate-400'}`}><input type="checkbox" checked={hasHeatedPool} onChange={e => setHasHeatedPool(e.target.checked)} className="hidden" />온수풀</label>
                        <label className={`p-2 rounded-lg border text-[10px] font-bold text-center cursor-pointer ${hasWalkingLane ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white text-slate-400'}`}><input type="checkbox" checked={hasWalkingLane} onChange={e => setHasWalkingLane(e.target.checked)} className="hidden" />걷기레인</label>
                    </div>
                </section>

            </form>
        </div>

        <div className="p-4 border-t border-slate-100 bg-white shrink-0">
            <button type="submit" form="pool-form-modal" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all">저장하기</button>
        </div>
      </div>
    </div>
  );
};

export default PoolFormModal;
