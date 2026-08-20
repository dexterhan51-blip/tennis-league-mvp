'use client';

import { PlusCircle, XCircle, Minus, Plus, Shuffle, Users, User, Edit3, Flag, Clock } from 'lucide-react';
import QuickDatePicker from '@/components/navigation/QuickDatePicker';
import { isGuestPlayer } from '@/utils/tennisLogic';
import type { Player } from '@/types';
import type { MatchCreationType } from '@/hooks/useMatchManagement';

interface MatchRegistrationPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  matchDate: string;
  onChangeDate: (date: string) => void;
  matchDates: string[];
  maleGuestCount: number;
  femaleGuestCount: number;
  setMaleGuestCount: (count: number) => void;
  setFemaleGuestCount: (count: number) => void;
  courtMinutes: number;
  setCourtMinutes: (min: number) => void;
  gameMinutes: number;
  setGameMinutes: (min: number) => void;
  isExhibition: boolean;
  onToggleExhibition: () => void;
  players: Player[];
  guestPlayers: Player[];
  selectedForMatch: string[];
  onTogglePlayer: (id: string) => void;
  onCreateMatch: (type: MatchCreationType) => void;
}

export default function MatchRegistrationPanel({
  isOpen,
  onToggle,
  matchDate,
  onChangeDate,
  matchDates,
  maleGuestCount,
  femaleGuestCount,
  setMaleGuestCount,
  setFemaleGuestCount,
  courtMinutes,
  setCourtMinutes,
  gameMinutes,
  setGameMinutes,
  isExhibition,
  onToggleExhibition,
  players,
  guestPlayers,
  selectedForMatch,
  onTogglePlayer,
  onCreateMatch,
}: MatchRegistrationPanelProps) {
  return (
    <section>
      <button
        onClick={onToggle}
        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all touch-target ${isOpen ? 'bg-card-soft text-ink-soft' : 'bg-accent hover:bg-accent-strong text-white'}`}
        aria-expanded={isOpen}
      >
        {isOpen ? <XCircle size={20}/> : <PlusCircle size={20}/>}
        {isOpen ? '닫기' : '게임 등록'}
      </button>

      {isOpen && (
        <div className={`mt-4 p-4 rounded-2xl border-2 animate-scale-in ${isExhibition ? 'bg-amber-500/10 border-amber-500/30' : 'bg-card-soft border-line'}`}>
          <div className="mb-4">
            <label className="block text-xs font-bold text-ink-mute mb-2">경기 날짜</label>
            <QuickDatePicker selectedDate={matchDate} onChange={onChangeDate} matchDates={matchDates} />
          </div>

          {/* Guest Counter */}
          <div className="mb-4 p-3 bg-card rounded-lg border border-dashed border-line-strong">
            <label className="block text-xs font-bold text-ink-mute mb-2">게스트</label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-soft">남자</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMaleGuestCount(maleGuestCount - 1)}
                    disabled={maleGuestCount <= 0}
                    className="w-8 h-8 rounded-full border border-line-strong flex items-center justify-center text-ink-soft disabled:opacity-30 disabled:cursor-not-allowed hover:bg-card-soft transition-colors touch-target"
                    aria-label="남자 게스트 감소"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center font-bold text-ink tabular-nums">{maleGuestCount}</span>
                  <button
                    onClick={() => setMaleGuestCount(maleGuestCount + 1)}
                    className="w-8 h-8 rounded-full border border-line-strong flex items-center justify-center text-ink-soft hover:bg-card-soft transition-colors touch-target"
                    aria-label="남자 게스트 증가"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-soft">여자</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFemaleGuestCount(femaleGuestCount - 1)}
                    disabled={femaleGuestCount <= 0}
                    className="w-8 h-8 rounded-full border border-line-strong flex items-center justify-center text-ink-soft disabled:opacity-30 disabled:cursor-not-allowed hover:bg-card-soft transition-colors touch-target"
                    aria-label="여자 게스트 감소"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center font-bold text-ink tabular-nums">{femaleGuestCount}</span>
                  <button
                    onClick={() => setFemaleGuestCount(femaleGuestCount + 1)}
                    className="w-8 h-8 rounded-full border border-line-strong flex items-center justify-center text-ink-soft hover:bg-card-soft transition-colors touch-target"
                    aria-label="여자 게스트 증가"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Court Time Settings */}
          <div className="mb-4 p-3 bg-card rounded-lg border border-dashed border-line-strong">
            <label className="block text-xs font-bold text-ink-mute mb-2 flex items-center gap-1">
              <Clock size={12} /> 코트 시간 설정
            </label>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-ink-mute mb-1 block">대여 시간</span>
                <div className="flex gap-1.5">
                  {[60, 90, 120, 150, 180].map(min => (
                    <button
                      key={min}
                      onClick={() => setCourtMinutes(min)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        courtMinutes === min
                          ? 'bg-accent text-white'
                          : 'bg-card-soft text-ink-soft hover:bg-line'
                      }`}
                    >
                      {min >= 60 ? `${min / 60}시간` : `${min}분`}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs text-ink-mute mb-1 block">게임당 시간</span>
                <div className="flex gap-1.5">
                  {[15, 20, 25, 30].map(min => (
                    <button
                      key={min}
                      onClick={() => setGameMinutes(min)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        gameMinutes === min
                          ? 'bg-accent text-white'
                          : 'bg-card-soft text-ink-soft hover:bg-line'
                      }`}
                    >
                      {min}분
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-line">
                <span className="text-xs text-ink-mute">예상 가능 게임</span>
                <span className="text-sm font-bold text-accent tabular-nums">{Math.floor(courtMinutes / gameMinutes)}게임</span>
              </div>
              {selectedForMatch.length >= 4 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-mute">1인당 적정</span>
                  <span className="text-sm font-bold text-up tabular-nums">~{Math.round(Math.floor(courtMinutes / gameMinutes) * 4 / selectedForMatch.length)}게임</span>
                </div>
              )}
            </div>
          </div>

          {/* Exhibition Toggle */}
          <div className="mb-4">
            <button
              onClick={onToggleExhibition}
              className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                isExhibition
                  ? 'bg-amber-500/10 border-amber-400 text-amber-600'
                  : 'bg-card border-line text-ink-mute'
              }`}
            >
              <div className="flex items-center gap-2">
                <Flag size={16} />
                <span className="font-bold text-sm">시범경기 모드</span>
              </div>
              <div className={`w-10 h-6 rounded-full transition-colors relative ${isExhibition ? 'bg-amber-400' : 'bg-line'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-card rounded-full shadow transition-transform ${isExhibition ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
              </div>
            </button>
            {isExhibition && (
              <p className="text-xs text-amber-600 mt-1 ml-1">랭킹에 반영되지 않습니다</p>
            )}
          </div>

          {/* Player Selection */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-ink-mute mb-2">참가 선수 선택</label>
            <div className="grid grid-cols-3 gap-2">
              {[...guestPlayers, ...players].map(p => {
                const isGuest = isGuestPlayer(p.id);
                const isSelected = selectedForMatch.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => onTogglePlayer(p.id)}
                    disabled={isGuest}
                    className={`p-3 rounded-lg border text-center text-xs font-bold transition-all touch-target ${
                      isSelected
                        ? isGuest
                          ? 'bg-accent-soft border-accent/40 border-dashed text-accent cursor-default'
                          : 'bg-accent border-accent text-white'
                        : 'bg-card border-line text-ink-soft hover:bg-card-soft'
                    }`}
                    aria-pressed={isSelected}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Match Type Buttons */}
          <div className="space-y-2">
            <button onClick={() => onCreateMatch('MIXED')} className="w-full bg-accent-soft border-2 border-accent/30 text-accent py-3 rounded-xl font-bold touch-target cursor-pointer active:scale-[0.98] transition-transform">
              <Shuffle size={16} className="inline -mt-0.5" /> 혼복 풀리그
            </button>
            <button onClick={() => onCreateMatch('MIXED_SINGLES')} className="w-full bg-card border-2 border-line-strong text-ink-soft py-3 rounded-xl font-bold touch-target cursor-pointer active:scale-[0.98] transition-transform">
              <User size={16} className="inline -mt-0.5" /> 단식 포함
              <span className="block text-[10px] font-medium text-ink-faint mt-0.5">남2/여3 · 남3/여2 — 단식 4 + 복식 3</span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onCreateMatch('DOUBLES')} className="bg-card border border-line text-ink-soft py-3 rounded-xl font-bold text-sm touch-target cursor-pointer active:scale-[0.98] transition-transform">
                <Users size={14} className="inline -mt-0.5" /> 복식
              </button>
              <button onClick={() => onCreateMatch('SINGLES')} className="bg-card border border-line text-ink-soft py-3 rounded-xl font-bold text-sm touch-target cursor-pointer active:scale-[0.98] transition-transform">
                <User size={14} className="inline -mt-0.5" /> 단식
              </button>
            </div>
            <button onClick={() => onCreateMatch('MANUAL')} className="w-full bg-card-soft text-ink-soft py-3 rounded-xl font-bold text-sm touch-target cursor-pointer active:scale-[0.98] transition-transform">
              <Edit3 size={14} className="inline -mt-0.5" /> 수동
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
