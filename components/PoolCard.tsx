
import React from 'react';
import { MapPin, Clock, Star } from 'lucide-react';
import { Pool } from '../types';

interface PoolCardProps {
  pool: Pool & { isAvailable?: boolean };
  onClick: (pool: Pool) => void;
  distance?: number;
}

const PoolCard: React.FC<PoolCardProps> = ({ pool, onClick, distance }) => {
  const adultFee = pool.fees.find(f => f.type === 'adult')?.price;
  const avgRating = pool.reviews.length > 0 
    ? (pool.reviews.reduce((acc, r) => acc + r.rating, 0) / pool.reviews.length).toFixed(1)
    : null;

  return (
    <div 
      onClick={() => onClick(pool)}
      className="bg-white rounded-3xl sm:rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden group"
    >
      <div className="relative h-48 sm:h-64 overflow-hidden">
        <img 
          src={pool.imageUrl} 
          alt={pool.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
        />
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
        <div className="flex justify-between items-start mb-3 sm:mb-4">
          <h3 className="text-xl sm:text-3xl font-black text-slate-900 group-hover:text-brand-600 transition-colors leading-tight line-clamp-1">
            {pool.name}
          </h3>
          {avgRating && (
            <div className="flex items-center gap-1 text-amber-500 font-black text-lg sm:text-xl">
              <Star size={18} className="fill-current sm:w-6 sm:h-6" /> {avgRating}
            </div>
          )}
        </div>
        
        <p className="text-sm sm:text-lg text-slate-500 flex items-center gap-2 mb-6 sm:mb-8 font-bold">
          <MapPin size={16} className="text-slate-300 shrink-0 sm:w-5 sm:h-5" /> 
          <span className="line-clamp-1">{pool.address}</span>
        </p>

        <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-10">
          {pool.freeSwimSchedule.slice(0, 1).map((s, i) => (
            <div key={i} className="bg-slate-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex justify-between items-center border border-slate-100/50">
              <span className="text-xs sm:text-base font-black text-slate-600">{s.day}</span>
              <span className="text-sm sm:text-xl font-black text-brand-600">{s.startTime} - {s.endTime}</span>
            </div>
          ))}
        </div>

        <div className="pt-6 sm:pt-8 border-t border-slate-50 flex justify-between items-center">
          <span className="text-[10px] sm:text-sm font-black text-slate-300 uppercase tracking-widest sm:tracking-[0.2em]">Adult Fee</span>
          <span className="text-xl sm:text-3xl font-black text-slate-900">
            {adultFee ? `${adultFee.toLocaleString()}원` : '정보없음'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PoolCard;
