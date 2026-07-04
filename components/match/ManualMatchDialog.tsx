'use client';

import { useState, useCallback } from 'react';
import { X, RotateCcw } from 'lucide-react';
import type { Player } from '@/types';
import { isGuestPlayer } from '@/utils/tennisLogic';

interface ManualMatchDialogProps {
  isOpen: boolean;
  players: Player[];       // 등록 선수 목록
  guestPlayers: Player[];  // 게스트 선수 목록
  onConfirm: (teamA: [Player, Player], teamB: [Player, Player]) => void;
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

  const allPlayers = [...guestPlayers, ...players];
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

  const handleConfirm = () => {
    if (!slots.a1 || !slots.a2 || !slots.b1 || !slots.b2) return;
    onConfirm([slots.a1, slots.a2], [slots.b1, slots.b2]);
    handleReset();
  };

  const handleClose = () => {
    handleReset();
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
            ? 'bg-clay-50 border-clay-300 text-clay-700'
            : isActive
              ? 'bg-yellow-50 border-yellow-400 text-yellow-700 animate-pulse'
              : 'bg-slate-50 border-slate-300 text-slate-400'
        }`}
      >
        {player ? player.name : `${label} 선택`}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center animate-fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl animate-scale-in max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-900">수동 대진 편성</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors touch-target"
              aria-label="초기화"
            >
              <RotateCcw size={18} className="text-slate-400" />
            </button>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors touch-target"
              aria-label="닫기"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* 대진표 */}
        <div className="p-4 flex-shrink-0">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
            {/* Team A */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-blue-600 text-center">팀 A</p>
              {renderSlot('a1', SLOT_LABELS.a1)}
              {renderSlot('a2', SLOT_LABELS.a2)}
            </div>

            {/* VS */}
            <div className="text-sm font-black text-slate-300 px-2">VS</div>

            {/* Team B */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-red-500 text-center">팀 B</p>
              {renderSlot('b1', SLOT_LABELS.b1)}
              {renderSlot('b2', SLOT_LABELS.b2)}
            </div>
          </div>
        </div>

        {/* 안내 텍스트 */}
        <div className="px-4 pb-2 flex-shrink-0">
          <p className="text-xs text-slate-400 text-center">
            {activeSlot
              ? `${activeSlot.startsWith('a') ? '팀 A' : '팀 B'}의 ${SLOT_LABELS[activeSlot]}를 선택하세요`
              : isFull
                ? '대진이 완성되었습니다'
                : '아래에서 선수를 탭하여 배정하세요'
            }
          </p>
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
                      ? 'bg-clay-100 border-clay-400 text-clay-700'
                      : isGuest
                        ? 'bg-slate-50 border-dashed border-slate-300 text-slate-500'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {p.name}
                  {isAssigned && (
                    <span className="block text-[10px] text-clay-500 mt-0.5">
                      {Object.entries(slots).find(([, v]) => v?.id === p.id)?.[0]?.startsWith('a') ? '팀A' : '팀B'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-3 p-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={handleClose}
            className="flex-1 py-3 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors touch-target"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isFull}
            className="flex-1 py-3 rounded-xl font-bold text-white bg-clay-600 hover:bg-clay-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors touch-target"
          >
            경기 생성
          </button>
        </div>
      </div>
    </div>
  );
}
