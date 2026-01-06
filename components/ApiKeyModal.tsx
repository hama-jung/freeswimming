import React, { useState } from 'react';
import { X, Key, ExternalLink, AlertCircle } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  savedKey: string;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, savedKey }) => {
  const [apiKey, setApiKey] = useState(savedKey);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-blue-50">
          <h3 className="font-bold text-blue-900 flex items-center gap-2">
            <Key className="w-5 h-5" />
            공공데이터 API 키 설정
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="text-sm text-slate-600 leading-relaxed">
            <p className="mb-2">
              전국 수영장 정보를 불러오기 위해 <span className="font-bold text-slate-800">공공데이터포털</span>의 인증키가 필요합니다.
            </p>
            <ol className="list-decimal pl-4 space-y-1 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <li><a href="https://www.data.go.kr/" target="_blank" rel="noreferrer" className="text-blue-600 underline hover:text-blue-800">공공데이터포털</a> 접속 및 로그인</li>
              <li>'전국수영장정보표준데이터' 검색 및 활용 신청</li>
              <li>마이페이지에서 '일반 인증키(Decoding)' 복사</li>
              <li>아래 입력창에 붙여넣기</li>
            </ol>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">인증키 (Service Key)</label>
            <input 
              type="text" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API 키를 입력하세요"
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono"
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              브라우저 환경(CORS)에 따라 직접 호출이 제한될 수 있습니다. 
              키가 올바르더라도 데이터가 로드되지 않을 경우, 모의 데이터가 표시됩니다.
            </p>
          </div>

          <button 
            onClick={() => onSave(apiKey)}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md"
          >
            저장하고 데이터 불러오기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;