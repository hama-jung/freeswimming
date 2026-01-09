
import React, { useState } from 'react';
import { MapPin, Star, Waves, ListFilter } from 'lucide-react';
import { Pool } from '../types';

interface PoolCardProps {
  pool: Pool & { isAvailable?: boolean };
  onClick: (pool: Pool) => void;
  distance?: number;
}

const PoolCard: React.FC<PoolCardProps> = ({ pool, onClick, distance }) => {
  const [imgError, setImgError] = useState(false);
  
  const adultFeeObj = pool.fees.find(f => f.type === 'adult');
  const adultFee = adultFeeObj?.price;
  const totalFeeCount = pool.fees.length;
  
  const avgRating = pool.reviews.length > 0 
    ? (pool.reviews.reduce((acc, r) => acc + r.rating, 0) / pool.reviews.length).toFixed(1)
    : null;

  const scheduleCount = pool.freeSwimSchedule.length;

  const PlaceholderImage = () => (
    <div className="w-full h-full bg-gradient-to-br from-brand-500 to-brand-700 flex flex-col items-center justify-center text-white p-6">
      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/30">
        <Waves size={32} strokeWidth={2.5} />
      </div>
      <span className="text-2xl font-black tracking-tight opacity-90">자유수영.kr</span>
      <span className="text-[10px] font-bold mt-2 opacity-50 uppercase tracking-[0.2em]">Ready for Swimming</span>
    </div>
  );

  return (
    <div 
      onClick={() => onClick(pool)}
      className="bg-white rounded-3xl sm:rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden group"
    >
      <div className="relative h-48 sm:h-64 overflow-hidden bg-slate-100">
        {(!pool.imageUrl || imgError) ? (
          <PlaceholderImage />
        ) : (
          <img 
            src={pool.imageUrl} 
            alt={pool.name} 
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
          />
        )}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex flex-col gap-3">
          <div className={`px-4 py-1.5 sm:px-5 sm:py-2 rounded-full text-xs sm:text-sm font-black text-white shadow-xl backdrop-blur-md border border-white/20 ${pool.isAvailable ? 'bg-emerald-500/90' : 'bg-slate-500/90'}`}>
            {pool.isAvailable ? '● 이용가능' : '○ 이용불가'}
          </div>
        </div>
        {distance !== undefined && (
          <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 bg-white/95 backdrop-blur-sm text-slate-900 px-4 py-1.5 sm:px-5 sm:py-2 rounded-xl sm:rounded-2xl text-sm sm:text-base font-black border border-white shadow-xl">
            {distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`}
          </div>
        )}
      </div>

      <div className="p-6 sm:p-10">
        <div className="flex justify-between items-start mb-2 sm:mb-3">
          <h3 className="text-xl sm:text-3xl font-black text-slate-900 group-hover:text-brand-600 transition-colors leading-tight line-clamp-1">
            {pool.name}
          </h3>
          {avgRating && (
            <div className="flex items-center gap-1 text-amber-500 font-black text-lg sm:text-xl">
              <Star size={18} className="fill-current sm:w-6 sm:h-6" /> {avgRating}
            </div>
          )}
        </div>
        
        <p className="text-sm sm:text-lg text-slate-500 flex items-center gap-2 mb-4 sm:mb-6 font-bold">
          <MapPin size={16} className="text-slate-300 shrink-0 sm:w-5 sm:h-5" /> 
          <span className="line-clamp-1">{pool.address}</span>
        </p>

        {/* 시간표 섹션 */}
        <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3">
          {pool.freeSwimSchedule.slice(0, 1).map((s, i) => (
            <div key={i} className="bg-slate-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex justify-between items-center border border-slate-100/50">
              <span className="text-xs sm:text-base font-black text-slate-600">{s.day}</span>
              <div className="flex flex-col items-end">
                <span className="text-sm sm:text-xl font-black text-brand-600">{s.startTime} - {s.endTime}</span>
              </div>
            </div>
          ))}
          {scheduleCount > 1 && (
            <div className="flex justify-end pr-1">
              <span className="text-[10px] sm:text-xs font-black text-slate-400 flex items-center gap-1 bg-slate-50/80 px-2 py-0.5 rounded-lg">
                <ListFilter size={12} className="text-brand-500" /> 외 {scheduleCount - 1}개 시간표 더보기
              </span>
            </div>
          )}
        </div>

        {/* 요금 섹션 - 줄간격을 좁히기 위해 pt-2로 조정 */}
        <div className="pt-2 sm:pt-3 border-t border-slate-50">
          <div className="flex items-center justify-between bg-slate-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-100/50">
            <span className="text-xs sm:text-base font-black text-slate-600">이용 요금</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm sm:text-xl font-black text-slate-900">
                {adultFee !== undefined ? `성인 ${adultFee.toLocaleString()}원` : '정보없음'}
              </span>
              {totalFeeCount > 1 && (
                <span className="text-[10px] sm:text-xs font-bold text-slate-400">
                  외 {totalFeeCount - 1}개
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoolCard;
