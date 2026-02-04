"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Calendar, CheckCircle, Circle, Trophy, Save, User } from "lucide-react";
import { Player } from "@/types";
import { useToast } from "@/contexts/ToastContext";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function NewLeaguePage() {
  const router = useRouter();
  const { showToast } = useToast();

  // 상태 관리
  const [leagueName, setLeagueName] = useState("");
  const [endDate, setEndDate] = useState("");
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 저장 슬롯 선택 (기본 1번)
  const [targetSlot, setTargetSlot] = useState<number>(1);
  const [existingSlots, setExistingSlots] = useState<boolean[]>([false, false, false]);

  // 덮어쓰기 확인 다이얼로그
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);

  useEffect(() => {
    // 선수 불러오기
    const savedPlayers = localStorage.getItem("tennis-players");
    if (savedPlayers) setAllPlayers(JSON.parse(savedPlayers));

    // 이미 사용 중인 슬롯 확인
    setExistingSlots([
        !!localStorage.getItem("league-slot-1"),
        !!localStorage.getItem("league-slot-2"),
        !!localStorage.getItem("league-slot-3"),
    ]);
  }, []);

  const togglePlayer = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(pid => pid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedIds.length === allPlayers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allPlayers.map(p => p.id));
    }
  };

  const createLeague = () => {
    const leaguePlayers = allPlayers.filter(p => selectedIds.includes(p.id));

    const leagueData = {
      name: leagueName,
      endDate: endDate,
      players: leaguePlayers,
      matches: [],
      createdAt: new Date().toISOString(),
    };

    // 1. 선택한 슬롯에 영구 저장 (패미콤 세이브)
    localStorage.setItem(`league-slot-${targetSlot}`, JSON.stringify(leagueData));

    // 2. 현재 실행할 게임으로 설정 (RAM 로드)
    localStorage.setItem("current-league", JSON.stringify(leagueData));
    localStorage.setItem("current-slot-index", targetSlot.toString());

    showToast(`${leagueName} 리그가 생성되었습니다!`, "success");
    router.push("/league");
  };

  const handleCreateLeague = () => {
    if (!leagueName.trim()) {
      showToast("리그 이름을 입력해주세요!", "warning");
      return;
    }
    if (selectedIds.length < 2) {
      showToast("최소 2명 이상의 선수가 필요합니다.", "warning");
      return;
    }

    if (existingSlots[targetSlot - 1]) {
      setShowOverwriteDialog(true);
      return;
    }

    createLeague();
  };

  return (
    <main className="max-w-md mx-auto min-h-screen bg-slate-50 pb-32">
      <header className="bg-white p-4 sticky top-0 z-10 border-b border-slate-200 flex items-center gap-4">
        <Link href="/" className="p-2 hover:bg-slate-100 rounded-full touch-target" aria-label="홈으로">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold text-slate-800">새 리그 설정</h1>
      </header>

      <div className="p-6 space-y-8">
        {/* 1. 리그 이름 */}
        <section>
          <label className="block text-sm font-bold text-slate-500 mb-2">리그 이름</label>
          <div className="relative">
            <Trophy className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input
              type="text"
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              placeholder="예: 2026 수요테니스"
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-bold text-slate-800"
              aria-label="리그 이름"
            />
          </div>
        </section>

        {/* 2. 저장 슬롯 선택 (패미콤 스타일) */}
        <section>
          <label className="block text-sm font-bold text-slate-500 mb-2">저장할 슬롯 선택</label>
          <div className="flex gap-2" role="radiogroup" aria-label="저장 슬롯 선택">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => setTargetSlot(num)}
                className={`flex-1 py-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all touch-target ${
                    targetSlot === num
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-400'
                }`}
                role="radio"
                aria-checked={targetSlot === num}
              >
                <span className="font-bold text-lg">SLOT {num}</span>
                <span className={`text-xs ${existingSlots[num-1] ? 'text-orange-500' : 'text-slate-400'}`}>
                    {existingSlots[num-1] ? '(데이터 있음)' : '(비어 있음)'}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* 3. 시즌 일정 */}
        <section>
          <label className="block text-sm font-bold text-slate-500 mb-2">시즌 종료일 (옵션)</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-medium"
              aria-label="시즌 종료일"
            />
          </div>
        </section>

        {/* 4. 선수 선택 */}
        <section>
          <div className="flex justify-between items-end mb-3">
            <label className="text-sm font-bold text-slate-500">선수 풀 (터치하여 참가)</label>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 touch-target"
              >
                {selectedIds.length === allPlayers.length ? '전체 해제' : '전체 선택'}
              </button>
              <span className="text-blue-600 font-bold text-sm bg-blue-50 px-2 py-1 rounded-lg">
                현재 {selectedIds.length}명
              </span>
            </div>
          </div>

          {allPlayers.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
              <User size={40} className="mx-auto mb-2 text-slate-300" />
              <p className="text-slate-400 text-sm">등록된 선수가 없습니다.</p>
              <Link
                href="/players"
                className="inline-block mt-3 text-blue-600 font-medium text-sm hover:underline"
              >
                선수 등록하러 가기 →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {allPlayers.map((player) => {
                const isSelected = selectedIds.includes(player.id);
                return (
                  <button
                    key={player.id}
                    onClick={() => togglePlayer(player.id)}
                    className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 touch-target ${
                        isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-transparent bg-white hover:bg-slate-50'
                    }`}
                    aria-pressed={isSelected}
                  >
                    {isSelected ? (
                      <CheckCircle className="text-blue-500 flex-shrink-0" size={20} />
                    ) : (
                      <Circle className="text-slate-300 flex-shrink-0" size={20} />
                    )}
                    {player.photo ? (
                      <img
                        src={player.photo}
                        alt={player.name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        player.gender === 'MALE' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'
                      }`}>
                        <User size={16} />
                      </div>
                    )}
                    <span className={`font-bold truncate ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                      {player.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t border-slate-100 max-w-md mx-auto">
        <button
          onClick={handleCreateLeague}
          disabled={!leagueName.trim() || selectedIds.length < 2}
          className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all touch-target ${
            leagueName.trim() && selectedIds.length >= 2
              ? 'bg-slate-800 text-white hover:bg-slate-900'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Save size={20} />
          리그 생성 및 저장
        </button>
      </div>

      {/* Overwrite Confirm Dialog */}
      <ConfirmDialog
        isOpen={showOverwriteDialog}
        title="슬롯 덮어쓰기"
        message={`슬롯 ${targetSlot}에 이미 데이터가 있습니다. 덮어쓰시겠습니까?`}
        confirmText="덮어쓰기"
        variant="danger"
        onConfirm={() => {
          setShowOverwriteDialog(false);
          createLeague();
        }}
        onCancel={() => setShowOverwriteDialog(false)}
      />
    </main>
  );
}
