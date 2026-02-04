"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Save, Trash2, CheckCircle, Gamepad2, Calendar, Users } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { LeagueData } from "@/types";

export default function LoadPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [slots, setSlots] = useState<(LeagueData | null)[]>([null, null, null]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [deleteSlotIdx, setDeleteSlotIdx] = useState<number | null>(null);

  useEffect(() => {
    const loadedSlots = [
      localStorage.getItem("league-slot-1"),
      localStorage.getItem("league-slot-2"),
      localStorage.getItem("league-slot-3"),
    ].map(item => item ? JSON.parse(item) : null);
    setSlots(loadedSlots);
  }, []);

  const handleSelectSlot = (index: number) => {
    if (!slots[index]) return;
    setSelectedIdx(index === selectedIdx ? null : index);
  };

  const handleLoadGame = () => {
    if (selectedIdx === null) {
      showToast("불러올 슬롯을 선택해주세요.", "warning");
      return;
    }
    const data = slots[selectedIdx];
    if (!data) {
      showToast("비어있는 슬롯입니다.", "error");
      return;
    }

    localStorage.setItem("current-slot-index", (selectedIdx + 1).toString());
    localStorage.setItem("current-league", JSON.stringify(data));

    showToast(`${data.name} 리그를 불러왔습니다.`, "success");
    router.push("/league");
  };

  const handleDelete = (slotIndex: number) => {
    localStorage.removeItem(`league-slot-${slotIndex + 1}`);
    const newSlots = [...slots];
    newSlots[slotIndex] = null;
    setSlots(newSlots);
    if (selectedIdx === slotIndex) setSelectedIdx(null);
    setDeleteSlotIdx(null);
    showToast(`슬롯 ${slotIndex + 1} 데이터가 삭제되었습니다.`, "success");
  };

  return (
    <main className="max-w-md mx-auto min-h-screen bg-slate-900 text-white pb-32">
      <header className="flex items-center gap-4 p-6 mb-2">
        <Link
          href="/"
          className="p-2 hover:bg-slate-800 rounded-full touch-target"
          aria-label="홈으로"
        >
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Gamepad2 className="text-blue-400" /> 리그 불러오기
        </h1>
      </header>

      <div className="px-6 space-y-4">
        {slots.map((slot, index) => {
          const isSelected = selectedIdx === index;
          const hasData = !!slot;

          return (
            <button
              key={index}
              onClick={() => handleSelectSlot(index)}
              disabled={!hasData}
              className={`relative w-full p-5 rounded-2xl border-2 text-left transition-all touch-target ${
                isSelected
                  ? 'bg-slate-800 border-blue-500'
                  : hasData
                  ? 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
                  : 'bg-slate-900/30 border-slate-800 cursor-not-allowed'
              }`}
              aria-pressed={isSelected}
            >
              <div className="flex justify-between items-start mb-3">
                <span
                  className={`text-xs font-bold px-2 py-1 rounded ${
                    isSelected ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  SLOT {index + 1}
                </span>
                {isSelected && <CheckCircle className="text-blue-500" size={20} />}
              </div>

              {slot ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center">
                      <Save size={24} className="text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold truncate">{slot.name}</h2>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(slot.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {slot.players?.length || 0}명
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteSlotIdx(index);
                    }}
                    className="absolute bottom-4 right-4 p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors touch-target"
                    aria-label={`슬롯 ${index + 1} 삭제`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-600">
                  <Save size={32} className="mx-auto mb-2 opacity-30" />
                  <p>데이터 없음</p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-slate-900 border-t border-slate-800 max-w-md mx-auto">
        <button
          onClick={handleLoadGame}
          disabled={selectedIdx === null}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all touch-target ${
            selectedIdx !== null
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          선택한 리그 불러오기
        </button>
      </div>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteSlotIdx !== null}
        title="슬롯 데이터 삭제"
        message={`슬롯 ${(deleteSlotIdx ?? 0) + 1}의 리그 데이터를 삭제하시겠습니까?`}
        confirmText="삭제"
        variant="danger"
        onConfirm={() => deleteSlotIdx !== null && handleDelete(deleteSlotIdx)}
        onCancel={() => setDeleteSlotIdx(null)}
      />
    </main>
  );
}
