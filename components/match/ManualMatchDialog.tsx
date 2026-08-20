'use client';

import { useState, useCallback } from 'react';
import { X, RotateCcw, UserPlus } from 'lucide-react';
import type { Player, Gender } from '@/types';
import { isGuestPlayer, isNamedGuest, createNamedGuest } from '@/utils/tennisLogic';

interface ManualMatchDialogProps {
  isOpen: boolean;
  players: Player[];       // 등록 선수 목록
  guestPlayers: Player[];  // 게스트 선수 목록
  /** isFriendly=true면 리그 밖 친선경기로 저장된다 (시즌 랭킹 미반영, 투어 랭킹 반영) */
  onConfirm: (teamA: [Player, Player], teamB: [Player, Player], isFriendly: boolean) => void;
  onClose: () => void;
}

type SlotKey = 'a1' | 'a2' | 'b1' | 'b2';

const SLOT_LABELS: Record<SlotKey, string> = {
  a1: '선수 1',
  a2: '선수 2',
  b1: '선수 1',
  b2: '선수 2',
};

export default function ManualMatchDialog({
  isOpen,
  players,
  guestPlayers,
  onConfirm,
  onClose,
}: ManualMatchDialogProps) {
  const [slots, setSlots] = useState<Record<SlotKey, Player | null>>({
    a1: null, a2: null, b1: null, b2: null,
  });
  const [activeSlot, setActiveSlot] = useState<SlotKey | null>(null);
  const [isFriendly, setIsFriendly] = useState(false);

  // 리그 미소속 실명 게스트 (이 다이얼로그에서 직접 추가)
  const [namedGuests, setNamedGuests] = useState<Player[]>([]);
  const [guestName, setGuestName] = useState('');
  const [guestGender, setGuestGender] = useState<Gender>('MALE');

  const allPlayers = [...namedGuests, ...guestPlayers, ...players];
  const assignedIds = new Set(
    Object.values(slots).filter(Boolean).map(p => p!.id)
  );

  const isFull = slots.a1 && slots.a2 && slots.b1 && slots.b2;

  const getNextEmptySlot = useCallback((): SlotKey | null => {
    const order: SlotKey[] = ['a1', 'a2', 'b1', 'b2'];
    return order.find(k => !slots[k]) || null;
  }, [slots]);

  const handlePlayerTap = (player: Player) => {
    // 이미 배정된 선수면 제거
    const existingSlot = (Object.entries(slots) as [SlotKey, Player | null][])
      .find(([, p]) => p?.id === player.id);
    if (existingSlot) {
      setSlots(prev => ({ ...prev, [existingSlot[0]]: null }));
      return;
    }

    // 슬롯이 활성화된 경우 해당 슬롯에 배정
    const targetSlot = activeSlot && !slots[activeSlot] ? activeSlot : getNextEmptySlot();
    if (!targetSlot) return;

    setSlots(prev => ({ ...prev, [targetSlot]: player }));
    setActiveSlot(null);
  };

  const handleSlotTap = (slotKey: SlotKey) => {
    if (slots[slotKey]) {
      // 이미 선수가 있으면 제거
      setSlots(prev => ({ ...prev, [slotKey]: null }));
      setActiveSlot(slotKey);
    } else {
      // 빈 슬롯이면 활성화
      setActiveSlot(slotKey === activeSlot ? null : slotKey);
    }
  };

  const handleReset = () => {
    setSlots({ a1: null, a2: null, b1: null, b2: null });
    setActiveSlot(null);
  };

  const handleAddGuest = () => {
    const guest = createNamedGuest(guestName, guestGender);
    if (!guest.name) return;
    setGuestName('');

    // 같은 이름이 이미 있으면 새로 만들지 않고 그 선수를 배정
    const existing = allPlayers.find(p => p.id === guest.id || p.name === guest.name);
    if (existing) {
      if (!assignedIds.has(existing.id)) handlePlayerTap(existing);
      return;
    }

    setNamedGuests(prev => [...prev, guest]);
    handlePlayerTap(guest);
  };

  const handleConfirm = () => {
    if (!slots.a1 || !slots.a2 || !slots.b1 || !slots.b2) return;
    onConfirm([slots.a1, slots.a2], [slots.b1, slots.b2], isFriendly);
    handleReset();
    setNamedGuests([]);
    setIsFriendly(false);
  };

  const handleClose = () => {
    handleReset();
    setNamedGuests([]);
    setGuestName('');
    setIsFriendly(false);
    onClose();
  };

  if (!isOpen) return null;

  const renderSlot = (slotKey: SlotKey, label: string) => {
    const player = slots[slotKey];
    const isActive = activeSlot === slotKey;
    return (
      <button
        onClick={() => handleSlotTap(slotKey)}
        className={`w-full px-3 py-2.5 rounded-lg border-2 border-dashed text-sm font-bold transition-all text-left ${
          player
            ? 'bg-accent-soft border-accent/50 text-accent'
            : isActive
              ? 'bg-card border-accent text-accent animate-pulse'
              : 'bg-card-soft border-line-strong text-ink-faint'
        }`}
      >
        {player ? player.name : `${label} 선택`}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center animate-fade-in">
      <div className="bg-card border border-line rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-xl animate-scale-in max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="p-4 border-b border-line flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-bold text-ink tracking-tight">수동 대진 편성</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 hover:bg-card-soft rounded-full transition-colors touch-target"
              aria-label="초기화"
            >
              <RotateCcw size={18} className="text-ink-faint" />
            </button>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-card-soft rounded-full transition-colors touch-target"
              aria-label="닫기"
            >
              <X size={20} className="text-ink-faint" />
            </button>
          </div>
        </div>

        {/* 대진표 */}
        <div className="p-4 flex-shrink-0">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
            {/* Team A */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-ink-mute text-center">팀 A</p>
              {renderSlot('a1', SLOT_LABELS.a1)}
              {renderSlot('a2', SLOT_LABELS.a2)}
            </div>

            {/* VS */}
            <div className="text-sm font-black text-ink-faint px-2">VS</div>

            {/* Team B */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-ink-mute text-center">팀 B</p>
              {renderSlot('b1', SLOT_LABELS.b1)}
              {renderSlot('b2', SLOT_LABELS.b2)}
            </div>
          </div>
        </div>

        {/* 안내 텍스트 */}
        <div className="px-4 pb-2 flex-shrink-0">
          <p className="text-xs text-ink-mute text-center">
            {activeSlot
              ? `${activeSlot.startsWith('a') ? '팀 A' : '팀 B'}의 ${SLOT_LABELS[activeSlot]}를 선택하세요`
              : isFull
                ? '대진이 완성되었습니다'
                : '아래에서 선수를 탭하여 배정하세요'
            }
          </p>
        </div>

        {/* 게스트 추가 (리그 미소속 선수) */}
        <div className="px-4 pb-3 flex-shrink-0">
          <div className="p-2.5 bg-card-soft rounded-lg border border-dashed border-line-strong">
            <div className="flex items-center gap-2">
              <input
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddGuest(); }}
                placeholder="게스트 이름"
                className="flex-1 min-w-0 px-2.5 py-2 text-sm border border-line-strong rounded-lg bg-card text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              />
              <div className="flex rounded-lg overflow-hidden border border-line-strong flex-shrink-0">
                {(['MALE', 'FEMALE'] as Gender[]).map(g => (
                  <button
                    key={g}
                    onClick={() => setGuestGender(g)}
                    className={`px-2.5 py-2 text-xs font-bold transition-colors ${
                      guestGender === g
                        ? g === 'MALE' ? 'bg-tint-m-bg text-tint-m-fg' : 'bg-tint-f-bg text-tint-f-fg'
                        : 'bg-card text-ink-faint'
                    }`}
                  >
                    {g === 'MALE' ? '남' : '여'}
                  </button>
                ))}
              </div>
              <button
                onClick={handleAddGuest}
                disabled={!guestName.trim()}
                className="p-2 rounded-lg bg-accent hover:bg-accent-strong text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 touch-target"
                aria-label="게스트 추가"
              >
                <UserPlus size={16} />
              </button>
            </div>
            <p className="text-[10px] text-ink-mute mt-1.5">
              리그 미소속 게스트 — 개인 기록(상대전적)에는 남지만 리그 랭킹에는 반영되지 않습니다
            </p>
          </div>
        </div>

        {/* 선수 목록 */}
        <div className="px-4 pb-3 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-3 gap-2">
            {allPlayers.map(p => {
              const isAssigned = assignedIds.has(p.id);
              const isGuest = isGuestPlayer(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => handlePlayerTap(p)}
                  className={`p-3 rounded-lg border text-center text-xs font-bold transition-all touch-target ${
                    isAssigned
                      ? 'bg-accent-soft border-accent/50 text-accent'
                      : isGuest
                        ? 'bg-card-soft border-dashed border-line-strong text-ink-mute'
                        : 'bg-card border-line text-ink-soft hover:bg-card-soft'
                  }`}
                >
                  {p.name}
                  {isNamedGuest(p.id) && (
                    <span className="block text-[10px] text-ink-faint mt-0.5">게스트</span>
                  )}
                  {isAssigned && (
                    <span className="block text-[10px] text-accent mt-0.5">
                      {Object.entries(slots).find(([, v]) => v?.id === p.id)?.[0]?.startsWith('a') ? '팀A' : '팀B'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 경기 종류: 리그전 / 친선 */}
        <div className="px-4 pb-3 flex-shrink-0">
          <div className="flex rounded-xl border border-line overflow-hidden text-sm font-bold" role="radiogroup" aria-label="경기 종류">
            <button
              onClick={() => setIsFriendly(false)}
              role="radio"
              aria-checked={!isFriendly}
              className={`flex-1 py-2.5 transition-colors touch-target ${
                !isFriendly ? 'bg-accent text-white' : 'bg-card-soft text-ink-soft hover:bg-line'
              }`}
            >
              리그전
            </button>
            <button
              onClick={() => setIsFriendly(true)}
              role="radio"
              aria-checked={isFriendly}
              className={`flex-1 py-2.5 transition-colors touch-target ${
                isFriendly ? 'bg-accent text-white' : 'bg-card-soft text-ink-soft hover:bg-line'
              }`}
            >
              친선경기
            </button>
          </div>
          {isFriendly && (
            <p className="text-[10px] text-ink-mute mt-1.5">
              친선경기는 시즌 랭킹에는 반영되지 않고, 종합(투어) 랭킹과 개인 기록에 누적됩니다.
            </p>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-3 p-4 border-t border-line flex-shrink-0">
          <button
            onClick={handleClose}
            className="flex-1 py-3 rounded-xl font-semibold text-ink-soft bg-card-soft hover:bg-line transition-colors touch-target"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isFull}
            className="flex-1 py-3 rounded-xl font-semibold text-white bg-accent hover:bg-accent-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-target"
          >
            경기 생성
          </button>
        </div>
      </div>
    </div>
  );
}
