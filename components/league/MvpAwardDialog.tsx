'use client';

import { Crown } from 'lucide-react';

interface MvpCandidate {
  name: string;
  winRate: number;
}

interface MvpAwardDialogProps {
  isOpen: boolean;
  matchDate: string;
  maleMvp: MvpCandidate | null;
  femaleMvp: MvpCandidate | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function MvpAwardDialog({
  isOpen,
  matchDate,
  maleMvp,
  femaleMvp,
  onConfirm,
  onCancel,
}: MvpAwardDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-6 text-center">
          <Crown className="w-12 h-12 mx-auto text-white mb-2" />
          <h3 className="text-xl font-bold text-white">{matchDate} 게임 종료</h3>
        </div>
        <div className="p-6 space-y-4">
          {maleMvp && (
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Crown size={20} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-blue-600 font-medium">남자 MVP</div>
                <div className="font-bold text-slate-900">{maleMvp.name}</div>
                <div className="text-xs text-slate-500">승률 {(maleMvp.winRate * 100).toFixed(0)}%</div>
              </div>
              <span className="text-lg font-bold text-blue-600">+2점</span>
            </div>
          )}
          {femaleMvp && (
            <div className="flex items-center gap-4 p-4 bg-pink-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                <Crown size={20} className="text-pink-600" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-pink-600 font-medium">여자 MVP</div>
                <div className="font-bold text-slate-900">{femaleMvp.name}</div>
                <div className="text-xs text-slate-500">승률 {(femaleMvp.winRate * 100).toFixed(0)}%</div>
              </div>
              <span className="text-lg font-bold text-pink-600">+2점</span>
            </div>
          )}
        </div>
        <div className="flex gap-3 p-4 border-t border-slate-200">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors touch-target"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors touch-target"
          >
            보너스 부여
          </button>
        </div>
      </div>
    </div>
  );
}
