
import React, { useState, useEffect } from 'react';
import { X, MapPin, Calendar, Star, Edit2, Sparkles, Waves, Thermometer, AlertCircle, Settings, History, Info, Baby, Footprints, Eye, EyeOff, RotateCcw, Loader2, Map as MapIcon, Phone, Clock, DollarSign, Globe, ChevronRight } from 'lucide-react';
import { Pool, Review, FreeSwimSchedule } from '../types';
import { generatePoolSummary } from '../services/geminiService';
import VersionHistory from './VersionHistory';

interface PoolDetailProps {
  pool: Pool;
  onClose: () => void;
  onUpdatePool: (updatedPool: Pool) => void;
  onEditRequest: (pool: Pool) => void;
  onDeleteRequest: (poolId: string) => void;
  user: any; 
  onLoginRequest: () => void;
}

const PoolDetail: React.FC<PoolDetailProps> = ({ pool, onClose, onUpdatePool, onEditRequest }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'community' | 'ai'>('info');
  const [newReview, setNewReview] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [reviewerName, setReviewerName] = useState("");
  const [aiSummary, setAiSummary] = useState<string>("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setAiSummary("");
    setActiveTab('info');
    setImgError(false);
  }, [pool.id]);

  const handleAddReview = () => {
    if (!newReview.trim()) return;
    const review: Review = {
      id: `rev-${Date.now()}`,
      userId: 'anonymous',
      userName: reviewerName.trim() || '익명 수영인',
      rating: newRating,
      content: newReview,
      date: new Date().toISOString().split('T')[0]
    };
    const updated = { ...pool, reviews: [review, ...pool.reviews] };
    onUpdatePool(updated);
    setNewReview("");
    setReviewerName("");
  };

  const fetchAiSummary = async () => {
    setIsLoadingAi(true);
    const summary = await generatePoolSummary(pool);
    setAiSummary(summary);
    setIsLoadingAi(false);
  };

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${pool.lat},${pool.lng}`;
    window.open(url, '_blank');
  };

  const openHomepage = () => {
    if (pool.homepageUrl) {
      window.open(pool.homepageUrl, '_blank');
    }
  };

  const formatWeekInfo = (weeks?: number[]) => {
    if (!weeks || weeks.includes(0)) return "매주";
    return weeks.map(w => `${w}주`).join(', ') + '차';
  };

  const holidayLabel = pool.closedDays === 'NONE' ? '연중무휴' : 
                   pool.closedDays === 'EVERY_MON' ? '매주 월요일' : 
                   pool.closedDays === 'EVERY_SUN' ? '매주 일요일' : 
                   pool.closedDays === 'SUN_2_4' ? '2, 4주 일요일' : pool.closedDays;

  const toggleVisibility = () => {
    const updated = { ...pool, isPublic: pool.isPublic === false };
    onUpdatePool(updated);
  };

  // 상세 페이지용 대체 이미지 UI
  const PlaceholderDetail = () => (
    <div className="w-full h-full bg-gradient-to-br from-brand-600 to-brand-800 flex flex-col items-center justify-center text-white">
      <div className="p-5 bg-white/10 rounded-3xl backdrop-blur-md border border-white/20 mb-6 scale-125">
        <Waves size={48} strokeWidth={2.5} />
      </div>
      <h2 className="text-4xl font-black tracking-tight mb-2">자유수영.kr</h2>
      <p className="text-white/40 font-bold uppercase tracking-[0.3em] text-xs">Premium Swimming Database</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header Image */}
        <div className="relative h-64 sm:h-80 shrink-0 bg-slate-200">
          {(!pool.imageUrl || imgError) ? (
            <PlaceholderDetail />
          ) : (
            <img 
              src={pool.imageUrl} 
              alt={pool.name} 
              onError={() => setImgError(true)}
              className="w-full h-full object-cover" 
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          <button onClick={onClose} className="absolute top-6 right-6 bg-white/20 hover:bg-white/40 text-white p-2.5 rounded-full transition-colors"><X className="w-7 h-7" /></button>
          
          <div className="absolute bottom-8 left-8 right-8 text-white">
            <h2 className="text-4xl font-black mb-3 tracking-tight">{pool.name}</h2>
            <div className="flex items-center gap-3 text-lg text-white/90">
                <div className="flex items-center gap-1.5 font-bold">
                  <MapPin className="w-5 h-5 text-brand-400" />
                  <span className="line-clamp-1">{pool.address}</span>
                </div>
                <button 
                  onClick={openInGoogleMaps} 
                  className="bg-white/20 hover:bg-white/40 p-2 rounded-xl backdrop-blur-md transition-all flex items-center gap-2 text-sm font-black border border-white/20 shadow-lg group active:scale-90 shrink-0"
                >
                  <MapIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">지도보기</span>
                </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 bg-white shrink-0 px-4">
          {[
            { id: 'info', label: '정보 및 요금' },
            { id: 'community', label: `리뷰 (${pool.reviews.length})` },
            { id: 'ai', label: 'AI 분석' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => { 
                setActiveTab(tab.id as any);
                if (tab.id === 'ai' && !aiSummary) fetchAiSummary();
              }}
              className={`flex-1 py-5 font-black text-base transition-all relative ${activeTab === tab.id ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-1/4 right-1/4 h-1.5 bg-brand-600 rounded-full"></div>}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          
          {activeTab === 'info' && (
            <div className="space-y-12 pb-12">
                {/* 1. 정기휴무 및 공휴일 */}
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2.5">
                            <Calendar className="w-7 h-7 text-red-500" /> 휴무 안내
                        </h3>
                        <button 
                          onClick={() => onEditRequest(pool)}
                          className="bg-white border-2 border-slate-100 text-slate-700 hover:text-brand-600 hover:border-brand-200 px-6 py-2 rounded-2xl text-base font-black flex items-center gap-2 transition-all shadow-sm active:scale-95"
                        >
                          <Edit2 className="w-4 h-4" /> 정보수정
                        </button>
                    </div>
                    
                    <div className="bg-white p-8 rounded-[32px] border-2 border-red-50 shadow-sm space-y-5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-slate-400 uppercase tracking-widest">정기 휴무일</span>
                        <div className="px-4 py-1.5 bg-red-50 rounded-full text-red-600 text-xs font-black">중요 정보</div>
                      </div>
                      <p className="text-2xl font-black text-red-500">{holidayLabel}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-3">
                          <AlertCircle className={`w-5 h-5 ${pool.holidayOptions?.publicHolidayEnabled ? 'text-red-500' : 'text-slate-300'}`} />
                          <span className={`text-base font-black ${pool.holidayOptions?.publicHolidayEnabled ? 'text-slate-700' : 'text-slate-300'}`}>법정 공휴일 {pool.holidayOptions?.publicHolidayEnabled ? '휴무' : '운영'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <AlertCircle className={`w-5 h-5 ${pool.holidayOptions?.temporaryHolidayEnabled ? 'text-amber-500' : 'text-slate-300'}`} />
                          <span className={`text-base font-black ${pool.holidayOptions?.temporaryHolidayEnabled ? 'text-slate-700' : 'text-slate-300'}`}>임시 공휴일 {pool.holidayOptions?.temporaryHolidayEnabled ? '휴무' : '운영'}</span>
                        </div>
                      </div>
                    </div>
                </div>

                {/* 2. 자유수영 시간표 */}
                <div className="space-y-6">
                  <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2.5">
                    <Clock className="w-7 h-7 text-brand-500" /> 자유수영 시간표
                  </h3>
                  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                    {pool.freeSwimSchedule.length > 0 ? pool.freeSwimSchedule.map((sch, i) => (
                      <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-100/50 space-y-3">
                        <div className="flex justify-between items-center">
                           <span className="text-sm font-black text-brand-500 uppercase tracking-widest">{formatWeekInfo(sch.weeks)}</span>
                           <span className="text-lg font-black text-slate-800">{sch.day}</span>
                        </div>
                        <div className="h-px bg-slate-200/50"></div>
                        <div className="flex justify-end">
                           <span className="text-2xl font-black text-slate-900 tracking-tight">{sch.startTime} ~ {sch.endTime}</span>
                        </div>
                      </div>
                    )) : <p className="text-base text-slate-400 text-center py-4 font-bold">등록된 시간표가 없습니다.</p>}
                  </div>
                </div>

                {/* 3. 이용요금 */}
                <div className="space-y-6">
                  <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2.5">
                    <DollarSign className="w-7 h-7 text-emerald-500" /> 이용 요금
                  </h3>
                  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-5">
                    {pool.fees.length > 0 ? pool.fees.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-base">
                        <div className="flex items-center gap-4">
                            <span className={`text-sm px-3 py-1.5 rounded-xl font-black ${f.category === '평일' ? 'bg-slate-100 text-slate-500' : 'bg-red-50 text-red-500'}`}>{f.category}</span>
                            <span className="text-slate-600 font-bold text-lg">{f.type === 'adult' ? '성인' : f.type === 'teen' ? '청소년' : f.type === 'child' ? '어린이' : '경로'}</span>
                        </div>
                        <span className="font-black text-slate-900 text-2xl">{f.price.toLocaleString()}원</span>
                      </div>
                    )) : <p className="text-base text-slate-400 text-center py-4 font-bold">등록된 요금이 없습니다.</p>}
                  </div>
                </div>

                {/* 4. 레인 정보 및 상세 시설 */}
                <div className="space-y-6">
                  <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2.5">
                    <Waves className="w-7 h-7 text-blue-500" /> 시설 안내
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    <div className="bg-white px-6 py-4 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-3">
                      <Waves className="w-6 h-6 text-brand-500" />
                      <span className="text-lg font-black text-slate-700">{pool.length}m 레인 / {pool.lanes}개</span>
                    </div>
                    {pool.hasKidsPool && (
                      <div className="bg-emerald-50 px-6 py-4 rounded-[24px] border border-emerald-100 shadow-sm flex items-center gap-3">
                        <Baby className="w-6 h-6 text-emerald-600" />
                        <span className="text-lg font-black text-emerald-700">유아풀 보유</span>
                      </div>
                    )}
                    {pool.hasHeatedPool && (
                      <div className="bg-orange-50 px-6 py-4 rounded-[24px] border border-orange-100 shadow-sm flex items-center gap-3">
                        <Thermometer className="w-6 h-6 text-orange-600" />
                        <span className="text-lg font-black text-orange-700">따뜻한 온수풀</span>
                      </div>
                    )}
                    {pool.hasWalkingLane && (
                      <div className="bg-blue-50 px-6 py-4 rounded-[24px] border border-blue-100 shadow-sm flex items-center gap-3">
                        <Footprints className="w-6 h-6 text-brand-600" />
                        <span className="text-lg font-black text-brand-700">걷기 전용 레인</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. 수영장 이용 참고사항 */}
                {pool.extraFeatures && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2.5">
                      <Info className="w-7 h-7 text-amber-500" /> 이용 꿀팁 & 참고사항
                    </h3>
                    <div className="bg-amber-50 p-8 rounded-[40px] border border-amber-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2">
                      <p className="text-xl font-bold text-slate-700 leading-relaxed whitespace-pre-line">
                        {pool.extraFeatures}
                      </p>
                    </div>
                  </div>
                )}

                {/* 6. 문의처 및 홈페이지 */}
                <div className="space-y-6">
                  <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2.5">
                    <Phone className="w-7 h-7 text-slate-600" /> 문의처
                  </h3>
                  <div className="flex flex-col gap-4">
                    <div className="bg-slate-900 p-8 rounded-[32px] shadow-xl flex items-center justify-between group overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><Phone className="w-32 h-32 text-white" /></div>
                      <div className="relative z-10">
                        <span className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1 block">전화번호</span>
                        <span className="text-2xl font-black text-white tracking-wider">{pool.phone || '번호 정보 없음'}</span>
                      </div>
                      <a href={`tel:${pool.phone}`} className="relative z-10 p-4 bg-brand-600 rounded-2xl text-white hover:bg-brand-500 transition-colors shadow-lg active:scale-90">
                        <Phone className="w-6 h-6" />
                      </a>
                    </div>

                    {pool.homepageUrl && (
                      <button 
                        onClick={openHomepage}
                        className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group hover:bg-slate-50 transition-all active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-brand-100 rounded-2xl flex items-center justify-center text-brand-600">
                            <Globe className="w-7 h-7" />
                          </div>
                          <div className="text-left">
                            <span className="text-sm font-black text-slate-400 uppercase tracking-widest block">공식 홈페이지</span>
                            <span className="text-xl font-black text-slate-800 truncate max-w-[200px] sm:max-w-xs">{pool.homepageUrl}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-6 h-6 text-slate-300 group-hover:translate-x-1 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-center pt-8">
                  <button 
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="text-sm font-black text-slate-400 flex items-center gap-2 hover:text-slate-600 transition-all border-2 border-slate-100 px-8 py-4 rounded-2xl hover:bg-white shadow-sm"
                  >
                    <History className="w-5 h-5" /> 데이터 변경이력 확인하기
                  </button>
                </div>
            </div>
          )}

          {activeTab === 'community' && (
            <div className="space-y-8">
                <div className="bg-brand-600/5 p-8 rounded-[32px] border border-brand-600/10">
                    <h3 className="font-black text-brand-900 mb-6 text-base">리뷰 작성하기</h3>
                    <div className="flex gap-2 mb-6">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button key={s} onClick={() => setNewRating(s)} className="active:scale-90 transition-transform"><Star className={`w-9 h-9 ${s <= newRating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} /></button>
                        ))}
                    </div>
                    <div className="space-y-4">
                        <input 
                          type="text" 
                          value={reviewerName} 
                          onChange={e => setReviewerName(e.target.value)} 
                          placeholder="작성자 이름"
                          className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-brand-500 focus:outline-none text-base font-bold bg-white"
                        />
                        <textarea 
                          value={newReview} onChange={e => setNewReview(e.target.value)} 
                          placeholder="수영장의 장단점이나 꿀팁을 공유해주세요!"
                          className="w-full p-6 rounded-[24px] border-2 border-slate-100 focus:border-brand-500 focus:outline-none text-base font-bold min-h-[140px] bg-white transition-all"
                        />
                    </div>
                    <div className="flex justify-end mt-6">
                        <button onClick={handleAddReview} className="bg-brand-600 text-white px-10 py-4 rounded-2xl font-black text-base shadow-xl hover:bg-brand-700 transition-all active:scale-95">리뷰 등록</button>
                    </div>
                </div>

                <div className="space-y-6">
                  {pool.reviews.map(r => (
                    <div key={r.id} className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600 font-black text-base">
                              {r.userName.slice(0, 1)}
                          </div>
                          <div>
                            <p className="text-base font-black text-slate-800">{r.userName}</p>
                            <div className="flex gap-1">
                              {[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-100'}`} />)}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-slate-300 font-black">{r.date}</span>
                      </div>
                      <p className="text-base text-slate-600 font-bold leading-relaxed pl-14">{r.content}</p>
                    </div>
                  ))}
                </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="h-full flex flex-col">
                <div className="bg-gradient-to-br from-indigo-600 to-brand-700 p-10 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10"><Sparkles className="w-32 h-32" /></div>
                    <div className="flex items-center gap-4 mb-8 relative z-10">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm shadow-inner"><Sparkles className="w-8 h-8" /></div>
                        <h3 className="text-2xl font-black tracking-tight">AI 실시간 정보 리포트</h3>
                    </div>
                    {isLoadingAi ? (
                        <div className="space-y-5 animate-pulse relative z-10">
                            <div className="h-5 bg-white/20 rounded-full w-3/4"></div>
                            <div className="h-5 bg-white/20 rounded-full w-1/2"></div>
                            <div className="h-5 bg-white/20 rounded-full w-5/6"></div>
                        </div>
                    ) : (
                        <div className="relative z-10">
                            <p className="text-white/95 whitespace-pre-line leading-relaxed text-lg font-bold">
                                {aiSummary || "정보를 정밀하게 분석하고 있습니다. 잠시만 기다려주세요."}
                            </p>
                        </div>
                    )}
                </div>
            </div>
          )}
        </div>
      </div>

      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-xl text-slate-800 flex items-center gap-3">
                <History className="w-6 h-6 text-brand-600" /> 상세 설정 및 이력
              </h3>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 focus:outline-none"><X className="w-7 h-7" /></button>
            </div>
            
            <div className="p-8 space-y-10 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="space-y-5">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">수영장 노출 설정</h4>
                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                  <div className="flex items-center gap-4">
                    {pool.isPublic !== false ? <Eye className="w-6 h-6 text-emerald-500" /> : <EyeOff className="w-6 h-6 text-red-500" />}
                    <div>
                      <div className="text-base font-black text-slate-800">{pool.isPublic !== false ? '현재 공개 중' : '현재 비공개 중'}</div>
                      <div className="text-xs text-slate-500 font-bold">비공개 시 목록에서 즉시 제외됩니다.</div>
                    </div>
                  </div>
                  <button 
                    onClick={toggleVisibility}
                    className={`relative w-16 h-8 rounded-full transition-colors ${pool.isPublic !== false ? 'bg-brand-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${pool.isPublic !== false ? 'translate-x-8' : 'translate-x-0'}`}></div>
                  </button>
                </div>
              </div>

              <div className="h-px bg-slate-100"></div>

              <VersionHistory 
                poolId={pool.id} 
                currentData={pool}
                onRestore={async (restoredData) => {
                  await onUpdatePool(restoredData);
                  setIsHistoryModalOpen(false);
                }} 
                onUpdatePool={onUpdatePool}
              />
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setIsHistoryModalOpen(false)} className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-base active:scale-95 transition-all shadow-xl">설정창 닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoolDetail;
