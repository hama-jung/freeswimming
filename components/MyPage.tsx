import React from 'react';
import { X, User, Edit3, MessageCircle, LogOut } from 'lucide-react';
import { User as UserType, Pool } from '../types';
import { getMyReviews } from '../services/storageService';

interface MyPageProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  allPools: Pool[];
  onLogout: () => void;
  onEditPool: (pool: Pool) => void;
}

const MyPage: React.FC<MyPageProps> = ({ isOpen, onClose, user, allPools, onLogout, onEditPool }) => {
  if (!isOpen) return null;

  const myPools = allPools.filter(p => p.createdBy === user.id);
  const myReviews = getMyReviews(user.id, allPools);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md h-[90vh] sm:h-auto sm:max-h-[80vh] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300 sm:zoom-in">
        
        {/* Header */}
        <div className="bg-blue-600 p-6 text-white shrink-0 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-blue-100 hover:text-white">
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-4 mt-2">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl shadow-lg">
                {user.nickname.slice(0, 1)}
            </div>
            <div>
                <h2 className="text-xl font-bold">{user.nickname}</h2>
                <p className="text-blue-100 text-sm">{user.email}</p>
                <div className="text-xs text-blue-200 mt-1">가입일: {user.joinedAt}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-6">
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">{myPools.length}</div>
                    <div className="text-xs text-slate-500 font-medium">등록한 수영장</div>
                </div>
                 <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">{myReviews.length}</div>
                    <div className="text-xs text-slate-500 font-medium">작성한 리뷰</div>
                </div>
            </div>

            {/* My Pools */}
            <div>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                    <Edit3 className="w-4 h-4 text-blue-500" /> 내가 등록/수정한 수영장
                </h3>
                <div className="space-y-3">
                    {myPools.length > 0 ? (
                        myPools.map(pool => (
                            <div key={pool.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-sm text-slate-800">{pool.name}</div>
                                    <div className="text-xs text-slate-500">{pool.region}</div>
                                </div>
                                <button 
                                    onClick={() => { onClose(); onEditPool(pool); }}
                                    className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200"
                                >
                                    수정
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-4 text-slate-400 text-xs">등록한 수영장이 없습니다.</div>
                    )}
                </div>
            </div>

            {/* My Reviews */}
            <div>
                 <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                    <MessageCircle className="w-4 h-4 text-blue-500" /> 내가 쓴 리뷰
                </h3>
                <div className="space-y-3">
                    {myReviews.length > 0 ? (
                        myReviews.map((item, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-sm text-blue-600">{item.poolName}</span>
                                    <span className="text-xs text-slate-400">{item.review.date}</span>
                                </div>
                                <p className="text-sm text-slate-600 line-clamp-2">{item.review.content}</p>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-4 text-slate-400 text-xs">작성한 리뷰가 없습니다.</div>
                    )}
                </div>
            </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
            <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-red-500 py-2 transition-colors text-sm"
            >
                <LogOut className="w-4 h-4" /> 로그아웃
            </button>
        </div>

      </div>
    </div>
  );
};

export default MyPage;