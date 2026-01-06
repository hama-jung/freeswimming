import React, { useState } from 'react';
import { X, User, Mail, LogIn } from 'lucide-react';
import { login } from '../services/authService';
import { User as UserType } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserType) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !nickname) {
        alert("이메일과 닉네임을 모두 입력해주세요.");
        return;
    }
    const user = login(email, nickname);
    onLoginSuccess(user);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-blue-50">
          <h3 className="font-bold text-blue-900 flex items-center gap-2">
            <LogIn className="w-5 h-5" />
            간편 로그인
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">이메일</label>
            <div className="relative">
                <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">닉네임</label>
            <div className="relative">
                <input 
                type="text" 
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="사용할 닉네임을 입력하세요"
                className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center pt-2">
             * 별도의 비밀번호 없이 간편하게 로그인할 수 있습니다.
          </p>

          <button 
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md mt-2"
          >
            로그인 시작하기
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;