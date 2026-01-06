
import React, { useState } from 'react';
import { X, MapPin, Phone, Calendar, Star, Edit2, MessageSquare, Sparkles, Trash2, UserCheck, ExternalLink, Map as MapIcon, CheckCircle2, Waves, Thermometer, AlertCircle } from 'lucide-react';
import { Pool, Review } from '../types';
import { generatePoolSummary } from '../services/geminiService';

interface PoolDetailProps {
  pool: Pool;
  onClose: () => void;
  onUpdatePool: (updatedPool: Pool) => void;
  onEditRequest: (pool: Pool) => void;
  onDeleteRequest: (poolId: string) => void;
  isUserCreated: boolean;
  user: any; 
  onLoginRequest: () => void;
}

const PoolDetail: React.FC<PoolDetailProps> = ({ pool, onClose, onUpdatePool, onEditRequest, onDeleteRequest, isUserCreated }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'community' | 'ai'>('info');
  const [newReview, setNewReview] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const handleAddReview = () => {
    if (!newReview.trim()) return;
    
    const review: Review = {
      id: `rev-${Date.now()}`,
      userId: 'anonymous',
      userName: '익명 수영인',
      rating: newRating,
      content: newReview,
      date: new Date().toISOString().split('T')[0]
    };
    
    const updated = { ...pool, reviews: [review, ...pool.reviews] };
    onUpdatePool(updated);
    setNewReview("");
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

  const holidayLabel = pool.closedDays === 'NONE' ? '연중무휴' : 
                   pool.closedDays === 'EVERY_MON' ? '매주 월요일' : 
                   pool.closedDays === 'EVERY_SUN' ? '매주 일요일' : 
                   pool.closedDays === 'SUN_2_4' ? '2, 4주 일요일' : pool.closedDays;

  const { holidayOptions } = pool;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header Image */}
        <div className="relative h-56 sm:h-72 shrink-0">
          <img src={pool.imageUrl || 'https://images.unsplash.com/photo-1519315530759-39149795460a?auto=format&fit=crop&q=80&w=800'} alt={pool.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-colors"><X className="w-6 h-6" /></button>
          
          <div className="absolute top-4 left-4 flex gap-2">
            {isUserCreated && (
              <div className="bg-indigo-600/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border border-white/20">
                <UserCheck className="w-3.5 h-3.5" /> 내가 등록한 정보
              </div>
            )}
          </div>

          <div className="absolute bottom-6 left-6 right-6 text-white">
            <h2 className="text-3xl font-bold mb-2 tracking-tight">{pool.name}</h2>
            <div className="flex items-center gap-2 text-sm text-white/90">
                <MapPin className="w-4 h-4 text-blue-400" />
                <span>{pool.address}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 bg-white shrink-0 px-2">
          {['info', 'community', 'ai'].map((tab) => (
            <button 
              key={tab}
              onClick={() => { 
                setActiveTab(tab as any);
                if (tab === 'ai' && !aiSummary) fetchAiSummary();
              }}
              className={`flex-1 py-4 font-bold text-sm transition-all relative ${activeTab === tab ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab === 'info' ? '정보 및 요금' : tab === 'community' ? `리뷰 (${pool.reviews.length})` : 'AI 분석'}
              {activeTab === tab && <div className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-blue-600 rounded-full"></div>}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {activeTab === 'info' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-500" /> 운영 정보
                    </h3>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onEditRequest(pool)}
                        className="bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <Edit2 className="w-4 h-4" /> 수정
                      </button>
                      {isUserCreated && (
                        <button 
                          onClick={() => onDeleteRequest(pool.id)}
                          className="bg-red-50 border border-red-100 text-red-500 hover:bg-red-100 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" /> 삭제
                        </button>
                      )}
                    </div>
                </div>

                {/* 특수 시설 태그 */}
                <div className="flex flex-wrap gap-2">
                    {pool.hasHeatedPool && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold border border-orange-200">
                            <Thermometer className="w-3 h-3" /> 온수풀
                        </span>
                    )}
                    {pool.hasWalkingLane && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold border border-blue-200">
                            <Waves className="w-3 h-3" /> 걷기 레인
                        </span>
                    )}
                    {pool.hasKidsPool && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                            <CheckCircle2 className="w-3 h-3" /> 유아풀
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        시설 정보
                        <button onClick={openInGoogleMaps} className="text-[10px] text-blue-600 flex items-center gap-1 hover:underline">
                            <MapIcon className="w-3 h-3" /> 지도 앱에서 보기
                        </button>
                    </h4>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">문의전화</span>
                      <span className="font-bold">{pool.phone || '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">레인 정보</span>
                      <span className="font-bold">{pool.length}m / {pool.lanes}레인</span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">정기 휴무일</h4>
                    <p className="text-sm font-bold text-red-500">{holidayLabel}</p>
                    
                    {/* 공휴일/임시공휴일 배지 추가 */}
                    {(holidayOptions?.publicHolidayEnabled || holidayOptions?.temporaryHolidayEnabled) && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {holidayOptions.publicHolidayEnabled && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded-md font-bold border border-red-100">
                            <AlertCircle className="w-2.5 h-2.5" /> 공휴일 휴무
                          </span>
                        )}
                        {holidayOptions.temporaryHolidayEnabled && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded-md font-bold border border-red-100">
                            <AlertCircle className="w-2.5 h-2.5" /> 임시공휴일 휴무
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">자유수영 시간표</h4>
                  <div className="space-y-3">
                    {pool.freeSwimSchedule.length > 0 ? pool.freeSwimSchedule.map((sch, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                        <span className="text-sm font-bold text-slate-700 w-24">{sch.day}</span>
                        <span className="text-sm font-bold text-blue-600">{sch.startTime} ~ {sch.endTime}</span>
                      </div>
                    )) : <p className="text-sm text-slate-400 text-center">등록된 시간표가 없습니다.</p>}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">이용 요금</h4>
                  <div className="space-y-3">
                    {pool.fees.length > 0 ? pool.fees.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${f.category === '평일' ? 'bg-slate-100 text-slate-500' : 'bg-red-50 text-red-500'}`}>{f.category}</span>
                            <span className="text-slate-500">{f.type === 'adult' ? '성인' : f.type === 'teen' ? '청소년' : f.type === 'child' ? '어린이' : '경로'}</span>
                        </div>
                        <span className="font-bold text-slate-800">{f.price.toLocaleString()}원</span>
                      </div>
                    )) : <p className="text-sm text-slate-400 text-center">등록된 요금이 없습니다.</p>}
                  </div>
                </div>

                {pool.extraFeatures && (
                    <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50">
                        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">참고 사항</h4>
                        <p className="text-sm text-blue-700 leading-relaxed whitespace-pre-line">{pool.extraFeatures}</p>
                    </div>
                )}
            </div>
          )}

          {activeTab === 'community' && (
            <div className="space-y-6">
                <div className="bg-blue-600/5 p-6 rounded-2xl border border-blue-600/10">
                    <h3 className="font-bold text-blue-900 mb-4 text-sm">리뷰 작성 (익명)</h3>
                    <div className="flex gap-1.5 mb-4">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button key={s} onClick={() => setNewRating(s)}><Star className={`w-7 h-7 ${s <= newRating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} /></button>
                        ))}
                    </div>
                    <textarea 
                      value={newReview} onChange={e => setNewReview(e.target.value)} 
                      placeholder="이 수영장은 어떤가요? 자유수영 꿀팁을 공유해주세요!"
                      className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm min-h-[100px] bg-white transition-all"
                    />
                    <div className="flex justify-end mt-4">
                        <button onClick={handleAddReview} className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-md hover:bg-blue-700 transition-all active:scale-95">리뷰 등록</button>
                    </div>
                </div>

                <div className="space-y-4">
                  {pool.reviews.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-10" />
                        <p className="text-sm font-medium">첫 번째 리뷰를 남겨주세요!</p>
                    </div>
                  ) : pool.reviews.map(r => (
                    <div key={r.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">익명</div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{r.userName}</p>
                            <div className="flex gap-0.5">
                              {[...Array(5)].map((_, i) => <Star key={i} className={`w-2.5 h-2.5 ${i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-100'}`} />)}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-300 font-medium">{r.date}</span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed pl-10">{r.content}</p>
                    </div>
                  ))}
                </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="h-full flex flex-col">
                <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="w-24 h-24" /></div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm"><Sparkles className="w-6 h-6" /></div>
                        <h3 className="text-xl font-bold">수영장 AI 리포트</h3>
                    </div>
                    
                    {isLoadingAi ? (
                        <div className="space-y-4 animate-pulse relative z-10">
                            <div className="h-4 bg-white/20 rounded w-3/4"></div>
                            <div className="h-4 bg-white/20 rounded w-1/2"></div>
                            <div className="h-4 bg-white/20 rounded w-5/6"></div>
                            <p className="text-xs text-white/60 mt-6 text-center">Gemini가 최신 정보를 바탕으로 분석 중입니다...</p>
                        </div>
                    ) : (
                        <div className="relative z-10">
                            <p className="text-white/90 whitespace-pre-line leading-relaxed text-sm font-medium">
                                {aiSummary}
                            </p>
                        </div>
                    )}
                </div>
                <p className="mt-4 text-[11px] text-slate-400 text-center">* AI 분석은 등록된 텍스트 정보를 기반으로 하며 실제와 다를 수 있습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PoolDetail;
