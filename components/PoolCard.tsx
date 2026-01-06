
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
      className="bg-white rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-3 transition-all duration-500 cursor-pointer overflow-hidden group"
    >
      <div className="relative h-64 overflow-hidden">
        <img 
          src={pool.imageUrl} 
          alt={pool.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
        />
        <div className="absolute top-6 left-6 flex flex-col gap-3">
          <div className={`px-5 py-2 rounded-full text-sm font-black text-white shadow-xl backdrop-blur-md border border-white/20 ${pool.isAvailable ? 'bg-emerald-500/90' : 'bg-slate-500/90'}`}>
            {pool.isAvailable ? '● 이용가능' : '○ 이용불가'}
          </div>
        </div>
        {distance !== undefined && (
          <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-sm text-slate-900 px-5 py-2 rounded-2xl text-base font-black border border-white shadow-xl">
            {distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`}
          </div>
        )}
      </div>

      <div className="p-10">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-3xl font-black text-slate-900 group-hover:text-brand-600 transition-colors leading-tight">
            {pool.name}
          </h3>
          {avgRating && (
            <div className="flex items-center gap-1.5 text-amber-500 font-black text-xl">
              <Star size={24} className="fill-current" /> {avgRating}
            </div>
          )}
        </div>
        
        <p className="text-lg text-slate-500 flex items-center gap-2 mb-8 font-bold">
          <MapPin size={20} className="text-slate-300 shrink-0" /> 
          <span className="line-clamp-1">{pool.address}</span>
        </p>

        <div className="space-y-4 mb-10">
          {pool.freeSwimSchedule.slice(0, 1).map((s, i) => (
            <div key={i} className="bg-slate-50 rounded-2xl p-5 flex justify-between items-center border border-slate-100/50">
              <span className="text-base font-black text-slate-600">{s.day}</span>
              <span className="text-xl font-black text-brand-600">{s.startTime} - {s.endTime}</span>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-slate-50 flex justify-between items-center">
          <span className="text-sm font-black text-slate-300 uppercase tracking-[0.2em]">Adult One-day</span>
          <span className="text-3xl font-black text-slate-900">
            {adultFee ? `${adultFee.toLocaleString()}원` : '정보없음'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PoolCard;
