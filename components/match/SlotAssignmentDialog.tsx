'use client';

import { useState, useCallback } from 'react';
import { X, RotateCcw } from 'lucide-react';
import type { Player } from '@/types';
import { getTemplateCounts, isSinglesTemplate, type TemplateKey } from '@/utils/tennisLogic';

interface SlotAssignmentDialogProps {
  templateKey: TemplateKey;
  men: Player[];
  women: Player[];
  onConfirm: (orderedMen: Player[], orderedWomen: Player[]) => void;
  onClose: () => void;
}

export default function SlotAssignmentDialog({
  templateKey,
  men,
  women,
  onConfirm,
  onClose,
}: SlotAssignmentDialogProps) {
  const { men: menCount, women: womenCount } = getTemplateCounts(templateKey);

  const [maleSlots, setMaleSlots] = useState<(Player | null)[]>(() => Array(menCount).fill(null));
  const [femaleSlots, setFemaleSlots] = useState<(Player | null)[]>(() => Array(womenCount).fill(null));
  const [activeSlot, setActiveSlot] = useState<{ gender: 'M' | 'W'; index: number } | null>(null);

  const isFull = maleSlots.every(Boolean) && femaleSlots.every(Boolean);

  const findPlayerSlot = useCallback(
    (player: Player): { gender: 'M' | 'W'; index: number } | null => {
      if (player.gender === 'MALE') {
        const idx = maleSlots.findIndex(p => p?.id === player.id);
        return idx >= 0 ? { gender: 'M', index: idx } : null;
      }
      const idx = femaleSlots.findIndex(p => p?.id === player.id);
      return idx >= 0 ? { gender: 'W', index: idx } : null;
    },
    [maleSlots, femaleSlots],
  );

  const getNextEmptySlot = useCallback(
    (gender: 'M' | 'W'): number | null => {
      const slots = gender === 'M' ? maleSlots : femaleSlots;
      const idx = slots.findIndex(p => !p);
      return idx >= 0 ? idx : null;
    },
    [maleSlots, femaleSlots],
  );

  const handlePlayerTap = (player: Player) => {
    // 이미 배정된 선수면 슬롯에서 제거
    const existing = findPlayerSlot(player);
    if (existing) {
      if (existing.gender === 'M') {
        setMaleSlots(prev => prev.map((p, i) => (i === existing.index ? null : p)));
      } else {
        setFemaleSlots(prev => prev.map((p, i) => (i === existing.index ? null : p)));
      }
      return;
    }

    const gender: 'M' | 'W' = player.gender === 'MALE' ? 'M' : 'W';

    // 활성화된 슬롯이 같은 성별이면 거기에, 아니면 같은 성별의 첫 빈 슬롯에 배정
    let targetIndex: number | null = null;
    if (activeSlot && activeSlot.gender === gender) {
      const slots = gender === 'M' ? maleSlots : femaleSlots;
      if (!slots[activeSlot.index]) targetIndex = activeSlot.index;
    }
    if (targetIndex === null) targetIndex = getNextEmptySlot(gender);
    if (targetIndex === null) return;

    if (gender === 'M') {
      const t = targetIndex;
      setMaleSlots(prev => prev.map((p, i) => (i === t ? player : p)));
    } else {
      const t = targetIndex;
      setFemaleSlots(prev => prev.map((p, i) => (i === t ? player : p)));
    }
    setActiveSlot(null);
  };

  const handleSlotTap = (gender: 'M' | 'W', index: number) => {
    const slots = gender === 'M' ? maleSlots : femaleSlots;
    if (slots[index]) {
      // 이미 채워져 있으면 비우기
      if (gender === 'M') {
        setMaleSlots(prev => prev.map((p, i) => (i === index ? null : p)));
      } else {
        setFemaleSlots(prev => prev.map((p, i) => (i === index ? null : p)));
      }
      setActiveSlot({ gender, index });
    } else {
      const isSame = activeSlot && activeSlot.gender === gender && activeSlot.index === index;
      setActiveSlot(isSame ? null : { gender, index });
    }
  };

  const handleReset = () => {
    setMaleSlots(Array(menCount).fill(null));
    setFemaleSlots(Array(womenCount).fill(null));
    setActiveSlot(null);
  };

  const handleConfirm = () => {
    if (!isFull) return;
    onConfirm(maleSlots as Player[], femaleSlots as Player[]);
  };

  const renderSlot = (gender: 'M' | 'W', index: number) => {
    const slots = gender === 'M' ? maleSlots : femaleSlots;
    const player = slots[index];
    const isActive = activeSlot?.gender === gender && activeSlot?.index === index;
    const label = `${gender === 'M' ? '남' : '여'}${index + 1}`;

    return (
      <button
        key={`${gender}${index}`}
        onClick={() => handleSlotTap(gender, index)}
        className={`w-full px-3 py-2.5 rounded-lg border-2 border-dashed text-sm font-bold transition-all flex items-center gap-2 ${
          player
            ? gender === 'M'
              ? 'bg-clay-50 border-clay-300 text-clay-700'
              : 'bg-pink-50 border-pink-300 text-pink-700'
            : isActive
              ? 'bg-yellow-50 border-yellow-400 text-yellow-700 animate-pulse'
              : 'bg-slate-50 border-slate-300 text-slate-400'
        }`}
        aria-label={`${label} 슬롯`}
      >
        <span
          className={`flex-shrink-0 w-9 text-center text-xs font-black ${
            player
              ? gender === 'M'
                ? 'text-clay-500'
                : 'text-pink-500'
              : 'text-slate-400'
          }`}
        >
          {label}
        </span>
        <span className="flex-1 text-left truncate">
          {player ? player.name : '선수 선택'}
        </span>
      </button>
    );
  };

  const assignedIds = new Set<string>([
    ...maleSlots.filter(Boolean).map(p => p!.id),
    ...femaleSlots.filter(Boolean).map(p => p!.id),
  ]);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="slot-assignment-title"
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl animate-scale-in max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 id="slot-assignment-title" className="text-lg font-bold text-slate-900">
              자리 배정
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              남{menCount} / 여{womenCount}{isSinglesTemplate(templateKey) ? ' · 단식 포함' : ''} · 가위바위보로 자리를 정하세요
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors touch-target"
              aria-label="초기화"
            >
              <RotateCcw size={18} className="text-slate-400" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors touch-target"
              aria-label="닫기"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* 슬롯 */}
        <div className="p-4 flex-shrink-0 space-y-3">
          {menCount > 0 && (
            <div>
              <p className="text-xs font-bold text-blue-600 mb-2">남자</p>
              <div className="space-y-2">
                {Array.from({ length: menCount }, (_, i) => renderSlot('M', i))}
              </div>
            </div>
          )}
          {womenCount > 0 && (
            <div>
              <p className="text-xs font-bold text-pink-600 mb-2">여자</p>
              <div className="space-y-2">
                {Array.from({ length: womenCount }, (_, i) => renderSlot('W', i))}
              </div>
            </div>
          )}
        </div>

        {/* 안내 */}
        <div className="px-4 pb-2 flex-shrink-0">
          <p className="text-xs text-slate-400 text-center">
            {activeSlot
              ? `${activeSlot.gender === 'M' ? '남' : '여'}${activeSlot.index + 1} 자리에 들어갈 선수를 탭하세요`
              : isFull
                ? '모든 자리가 배정되었습니다'
                : '슬롯을 탭한 뒤 아래에서 선수를 선택하세요'
            }
          </p>
        </div>

        {/* 선수 풀 */}
        <div className="px-4 pb-3 overflow-y-auto flex-1 min-h-0">
          {men.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-bold text-blue-600 mb-1.5">남자 선수</p>
              <div className="grid grid-cols-3 gap-2">
                {men.map(p => {
                  const slot = findPlayerSlot(p);
                  const isAssigned = assignedIds.has(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => handlePlayerTap(p)}
                      className={`p-3 rounded-lg border text-center text-xs font-bold transition-all touch-target ${
                        isAssigned
                          ? 'bg-blue-100 border-blue-400 text-blue-700'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {p.name}
                      {slot && (
                        <span className="block text-[10px] text-blue-500 mt-0.5">
                          남{slot.index + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {women.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-pink-600 mb-1.5">여자 선수</p>
              <div className="grid grid-cols-3 gap-2">
                {women.map(p => {
                  const slot = findPlayerSlot(p);
                  const isAssigned = assignedIds.has(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => handlePlayerTap(p)}
                      className={`p-3 rounded-lg border text-center text-xs font-bold transition-all touch-target ${
                        isAssigned
                          ? 'bg-pink-100 border-pink-400 text-pink-700'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {p.name}
                      {slot && (
                        <span className="block text-[10px] text-pink-500 mt-0.5">
                          여{slot.index + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-3 p-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors touch-target"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isFull}
            className="flex-1 py-3 rounded-xl font-bold text-white bg-clay-600 hover:bg-clay-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors touch-target"
          >
            대진 생성
          </button>
        </div>
      </div>
    </div>
  );
}
