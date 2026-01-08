
import React, { useEffect, useState } from 'react';
import { History, Download, RotateCcw, Clock, FileJson, Loader2 } from 'lucide-react';
import { Pool, PoolHistory } from '../types';
import { getPoolHistory } from '../services/storageService';

interface VersionHistoryProps {
  poolId: string;
  currentData: Pool;
  onRestore: (data: Pool) => Promise<void> | void;
  onUpdatePool: (data: Pool) => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ poolId, currentData, onRestore }) => {
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

  const handleRestoreClick = async (snapshot: PoolHistory) => {
    if (isRestoring) return;
    const isConfirmed = window.confirm(`${formatDateTime(snapshot.createdAt)} 시점의 데이터로 복구할까요?\n현재 저장된 정보가 해당 시점의 정보로 덮어씌워집니다.`);
    
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
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `backup_${snapshot.data.name}_${snapshot.createdAt}.json`);
    linkElement.click();
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (isLoading) return <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-300" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
        <History className="w-4 h-4 text-blue-500" /> 정보 변경 이력 (최근 {history.length})
      </h3>

      {history.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200">
          <Clock className="w-6 h-6 mx-auto mb-2 text-slate-200" />
          <p className="text-[11px] text-slate-400 font-bold">수정 시 이전 정보가 자동 백업됩니다.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
          {history.map((item) => (
            <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <FileJson size={14} className="text-blue-400" />
                <span className="text-[11px] font-bold text-slate-600">{formatDateTime(item.createdAt)}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleDownload(item)} className="p-1.5 text-slate-300 hover:text-blue-500 transition-all"><Download size={14} /></button>
                <button 
                  onClick={() => handleRestoreClick(item)} 
                  disabled={!!isRestoring}
                  className="flex items-center gap-1 px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black hover:bg-blue-600 transition-all disabled:opacity-50"
                >
                  {isRestoring === item.id ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />}
                  복구
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VersionHistory;
