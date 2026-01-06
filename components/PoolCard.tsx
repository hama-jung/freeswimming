
import React from 'react';
import { MapPin, Clock, UserCheck } from 'lucide-react';
import { Pool } from '../types';

interface PoolCardProps {
  pool: Pool;
  onClick: (pool: Pool) => void;
  distance?: number;
  isUserCreated?: boolean;
}

const PoolCard: React.FC<PoolCardProps> = ({ pool, onClick, distance, isUserCreated }) => {
  const adultFee = pool.fees.find(f => f.type === 'adult')?.price;

  return (
    <div 
      onClick={() => onClick(pool)}
      className="bg-white rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-50 overflow-hidden cursor-pointer group flex flex-col"
    >
      <div className="relative h-60 overflow-hidden shrink-0">
        <img 
          src={pool.imageUrl} 
          alt={pool.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute top-4 right-4 flex gap-2">
          {isUserCreated && (
            <div className="bg-indigo-600 text-white text-xs font-black px-4 py-2 rounded-full shadow-xl border border-white/20 flex items-center gap-1.5 backdrop-blur-md">
              <UserCheck className="w-4 h-4" /> 내 등록
            </div>
          )}
          <div className="bg-blue-600 text-white text-xs font-black px-4 py-2 rounded-full shadow-xl border border-white/20 backdrop-blur-md">
            {pool.region}
          </div>
        </div>
        {distance !== undefined && (
          <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-xl text-white text-sm font-black px-4 py-2 rounded-2xl flex items-center gap-2 border border-white/10 shadow-2xl">
             <MapPin className="w-4 h-4 text-blue-400" />
             {distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`}
          </div>
        )}
      </div>
      
      <div className="p-8 flex-1 flex flex-col">
        <div className="mb-6">
            <h3 className="text-2xl font-black text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors tracking-tight">
            {pool.name}
            </h3>
        </div>
        
        <div className="space-y-4 text-base text-slate-500 mb-8 flex-1">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-slate-300 shrink-0" />
            <span className="truncate font-medium">{pool.address}</span>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-500 shrink-0 mt-1" />
            <div className="flex flex-col gap-2 w-full">
               {pool.freeSwimSchedule.length > 0 ? (
                 pool.freeSwimSchedule.slice(0, 2).map((sch, idx) => (
                   <div key={idx} className="flex justify-between items-center bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                      <span className="font-black text-slate-700 text-sm">{sch.day}</span>
                      <span className="text-blue-600 font-bold text-sm">{sch.startTime} - {sch.endTime}</span>
                   </div>
                 ))
               ) : (
                 <span className="text-sm text-slate-400 font-bold">자유수영 시간 정보 없음</span>
               )}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
             <span className="text-sm text-slate-400 font-bold uppercase tracking-wider">성인 일일 입장</span>
             <span className="text-2xl font-black text-blue-600">
                {adultFee ? `${adultFee.toLocaleString()}원` : '정보없음'}
             </span>
        </div>
      </div>
    </div>
  );
};

export default PoolCard;
