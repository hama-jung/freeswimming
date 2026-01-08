
import React, { useEffect, useState } from 'react';
import { History, Download, RotateCcw, Clock, AlertTriangle, FileJson, Loader2, Eye, EyeOff } from 'lucide-react';
import { Pool, PoolHistory } from '../types';
import { getPoolHistory } from '../services/storageService';

interface VersionHistoryProps {
  poolId: string;
  currentData: Pool;
  onRestore: (data: Pool) => Promise<void> | void;
  onUpdatePool: (data: Pool) => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ poolId, currentData, onRestore, onUpdatePool }) => {
  const [history, setHistory] = useState<PoolHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [poolId]);

  const loadHistory = async () => {
    setIsLoading(true);
    const data = await getPoolHistory(poolId);
    setHistory(data);
    setIsLoading(false);
  };

  const handleTogglePublic = () => {
    const nextState = currentData.isPublic === false;
    onUpdatePool({ ...currentData, isPublic: nextState });
    alert(nextState ? "수영장 정보가 공개 상태로 변경되었습니다." : "수영장 정보가 비공개 상태로 변경되었습니다.");
  };

  const handleRestoreClick = async (snapshot: PoolHistory) => {
    if (isRestoring) return;
    
    const isConfirmed = window.confirm(`${formatDateTime(snapshot.createdAt)} 시점의 데이터로 복구할까요?\n현재 입력된 정보가 모두 덮어씌워집니다.`);
    
    if (isConfirmed) {
      setIsRestoring(snapshot.id);
      try {
        await onRestore(snapshot.data);
      } catch (e) {
        console.error("복구 실패:", e);
        alert("복구 중 오류가 발생했습니다.");
      } finally {
        setIsRestoring(null);
      }
    }
  };

  const handleDownload = (snapshot: PoolHistory) => {
    const dataStr = JSON.stringify(snapshot.data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `pool_backup_${snapshot.data.name}_${snapshot.createdAt.split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        <p className="text-sm">변경 이력을 불러오는 중...</p>
      </div>
    );
  }

  const isPublic = currentData.isPublic !== false;

  return (
    <div className="space-y-6">
      {/* 공개/비공개 설정 (최상단) */}
      <div className={`p-6 rounded-3xl border-2 transition-all flex items-center justify-between ${isPublic ? 'bg-blue-50 border-blue-200' : 'bg-slate-900 border-slate-800 text-white'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isPublic ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}>
            {isPublic ? <Eye size={24} /> : <EyeOff size={24} />}
          </div>
          <div>
            <h4 className={`font-bold text-lg ${isPublic ? 'text-blue-900' : 'text-white'}`}>공개 여부 설정</h4>
            <p className={`text-xs ${isPublic ? 'text-blue-600' : 'text-slate-400'}`}>
              {isPublic ? '현재 모든 사용자에게 이 수영장이 노출되고 있습니다.' : '현재 비공개 상태로, 지도와 목록에서 숨겨졌습니다.'}
            </p>
          </div>
        </div>
        <button 
          onClick={handleTogglePublic}
          className={`relative w-16 h-8 rounded-full transition-colors ${isPublic ? 'bg-blue-600' : 'bg-slate-700'}`}
        >
          <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform shadow-md ${isPublic ? 'translate-x-8' : 'translate-x-0'}`}></div>
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 leading-relaxed">
          <p className="font-bold mb-1">데이터 관리 가이드</p>
          수정하기 버튼을 누를 때마다 이전 데이터가 자동으로 백업됩니다. 실수로 정보를 잘못 입력했다면 아래 목록에서 원하는 시점으로 복구하세요.
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <History className="w-4 h-4 text-blue-500" /> 과거 데이터 스냅샷 ({history.length})
        </h3>

        {history.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
            <Clock className="w-10 h-10 mx-auto mb-3 text-slate-200" />
            <p className="text-sm text-slate-400 font-medium">아직 생성된 백업 이력이 없습니다.<br/>정보 수정 시 자동으로 생성됩니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition-colors group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                      <FileJson size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800">{formatDateTime(item.createdAt)}</div>
                      <div className="text-[10px] text-slate-400 font-medium">스냅샷 ID: {item.id}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleDownload(item)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      title="JSON 다운로드"
                    >
                      <Download size={18} />
                    </button>
                    <button 
                      onClick={() => handleRestoreClick(item)}
                      disabled={!!isRestoring}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px] justify-center"
                    >
                      {isRestoring === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw size={14} />
                      )}
                      {isRestoring === item.id ? '처리 중' : '복구하기'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
        <div className="text-[11px] text-blue-700 font-medium">내보내기 기능을 통해 전체 수영장 목록을 백업할 수 있습니다.</div>
        <button 
          onClick={() => {
            const allPoolsLocal = localStorage.getItem('swimming_app_universal_pools');
            if (allPoolsLocal) {
              const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(allPoolsLocal);
              const link = document.createElement('a');
              link.setAttribute('href', dataUri);
              link.setAttribute('download', `자유수영_전체백업_${new Date().toISOString().split('T')[0]}.json`);
              link.click();
            }
          }}
          className="text-[11px] font-bold text-blue-600 underline"
        >
          전체 데이터 백업
        </button>
      </div>
    </div>
  );
};

export default VersionHistory;
