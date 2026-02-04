"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, UserPlus, Trash2, User, Camera, Image as ImageIcon, X, GripVertical } from "lucide-react";
import { Player, Gender } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/contexts/ToastContext";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PlayerSearch, { highlightMatch } from "@/components/player/PlayerSearch";
import PlayerEditModal from "@/components/player/PlayerEditModal";
import { useDragSort } from "@/hooks/useDragSort";

export default function PlayersPage() {
  const { showToast } = useToast();

  // 선수 목록 상태
  const [players, setPlayers] = useState<Player[]>([]);

  // 입력 폼 상태
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("MALE");
  const [photo, setPhoto] = useState<string | null>(null);

  // 검색 상태
  const [searchQuery, setSearchQuery] = useState("");

  // 모달 상태
  const [deletePlayerId, setDeletePlayerId] = useState<string | null>(null);
  const [editPlayer, setEditPlayer] = useState<Player | null>(null);

  // 파일 입력 ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Drag sort
  const { isDragging, setContainerRef, getItemProps, getDragHandleProps, handlers } = useDragSort({
    items: players,
    onReorder: (newPlayers) => {
      setPlayers(newPlayers);
      showToast("선수 순서가 변경되었습니다.", "success");
    },
  });

  // 1. 처음 켜졌을 때 저장된 데이터 불러오기
  useEffect(() => {
    const saved = localStorage.getItem("tennis-players");
    if (saved) {
      setPlayers(JSON.parse(saved));
    }
  }, []);

  // 2. 선수가 바뀔 때마다 자동 저장
  useEffect(() => {
    localStorage.setItem("tennis-players", JSON.stringify(players));
  }, [players]);

  // 필터링된 선수 목록
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players;
    const query = searchQuery.toLowerCase();
    return players.filter((p) => p.name.toLowerCase().includes(query));
  }, [players, searchQuery]);

  // 이미지 리사이즈 및 압축 함수 (용량 최적화)
  const resizeImage = useCallback((file: File, maxWidth: number = 200, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);

          canvas.width = img.width * (ratio < 1 ? ratio : 1);
          canvas.height = img.height * (ratio < 1 ? ratio : 1);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  // 파일 선택 핸들러
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('이미지 파일만 선택해주세요.', 'error');
      return;
    }

    try {
      const resizedImage = await resizeImage(file);
      setPhoto(resizedImage);
    } catch (error) {
      console.error('이미지 처리 실패:', error);
      showToast('이미지 처리에 실패했습니다.', 'error');
    }

    e.target.value = '';
  }, [resizeImage, showToast]);

  // 사진 삭제
  const handleRemovePhoto = useCallback(() => {
    setPhoto(null);
  }, []);

  // 선수 추가 함수
  const handleAdd = useCallback(() => {
    if (!name.trim()) {
      showToast("이름을 입력해주세요.", "warning");
      return;
    }

    const newPlayer: Player = {
      id: uuidv4(),
      name: name.trim(),
      gender: gender,
      photo: photo || undefined,
    };

    setPlayers([...players, newPlayer]);
    setName("");
    setPhoto(null);
    showToast(`${newPlayer.name} 선수가 등록되었습니다.`, "success");
  }, [name, gender, photo, players, showToast]);

  // 선수 삭제 함수
  const handleDelete = useCallback((id: string) => {
    const player = players.find(p => p.id === id);
    setPlayers(players.filter(p => p.id !== id));
    setDeletePlayerId(null);
    if (player) {
      showToast(`${player.name} 선수가 삭제되었습니다.`, "success");
    }
  }, [players, showToast]);

  // 선수 정보 수정
  const handleSaveEdit = useCallback((updatedPlayer: Player) => {
    setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
    setEditPlayer(null);
    showToast(`${updatedPlayer.name} 선수 정보가 수정되었습니다.`, "success");
  }, [showToast]);

  return (
    <main className="max-w-md mx-auto min-h-screen bg-slate-50 p-4 pb-24">
      {/* 헤더 */}
      <header className="flex items-center gap-4 mb-6">
        <Link href="/" className="p-2 hover:bg-slate-200 rounded-full transition-colors bg-white shadow-sm touch-target" aria-label="홈으로">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold text-slate-800">선수 관리</h1>
      </header>

      {/* 검색 */}
      <div className="mb-4">
        <PlayerSearch onSearch={setSearchQuery} placeholder="선수 이름 검색..." />
      </div>

      {/* 1. 선수 등록 폼 */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <h2 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">새 멤버 등록</h2>

        {/* 사진 등록 영역 */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            {photo ? (
              <div className="relative">
                <img
                  src={photo}
                  alt="프로필 미리보기"
                  className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 shadow-sm"
                />
                <button
                  onClick={handleRemovePhoto}
                  className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md touch-target"
                  aria-label="사진 삭제"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center">
                <User size={32} className="text-slate-300" />
              </div>
            )}
          </div>
        </div>

        {/* 사진 선택 버튼들 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 font-medium transition-colors touch-target"
          >
            <Camera size={18} />
            <span className="text-sm">카메라</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 font-medium transition-colors touch-target"
          >
            <ImageIcon size={18} />
            <span className="text-sm">앨범</span>
          </button>
        </div>

        {/* 숨겨진 파일 입력 */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex gap-2 mb-3">
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름 입력"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                aria-label="선수 이름"
            />
            <button
                onClick={handleAdd}
                className="bg-slate-800 text-white px-5 rounded-xl font-bold hover:bg-slate-900 transition-colors touch-target"
            >
                추가
            </button>
        </div>

        {/* 성별 선택 */}
        <div className="flex gap-2" role="radiogroup" aria-label="성별 선택">
            <button
                onClick={() => setGender("MALE")}
                className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all touch-target ${gender === 'MALE' ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-slate-100 text-slate-400 bg-slate-50'}`}
                role="radio"
                aria-checked={gender === 'MALE'}
            >
                남자
            </button>
            <button
                onClick={() => setGender("FEMALE")}
                className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all touch-target ${gender === 'FEMALE' ? 'border-pink-500 text-pink-600 bg-pink-50' : 'border-slate-100 text-slate-400 bg-slate-50'}`}
                role="radio"
                aria-checked={gender === 'FEMALE'}
            >
                여자
            </button>
        </div>
      </div>

      {/* 2. 선수 목록 리스트 */}
      <div className="space-y-3">
        <div className="flex justify-between items-end px-1">
            <h2 className="text-lg font-bold text-slate-800">
              등록된 선수 <span className="text-blue-600">{players.length}</span>명
              {searchQuery && (
                <span className="text-sm font-normal text-slate-500 ml-2">
                  ({filteredPlayers.length}명 표시)
                </span>
              )}
            </h2>
        </div>

        {filteredPlayers.length === 0 ? (
            <div className="text-center py-10 text-slate-400 bg-white rounded-2xl border border-slate-100 border-dashed">
                <UserPlus size={48} className="mx-auto mb-2 opacity-20" />
                <p>{searchQuery ? '검색 결과가 없습니다.' : '아직 등록된 선수가 없습니다.'}</p>
            </div>
        ) : (
            <div
              ref={(el) => setContainerRef(el)}
              {...handlers}
              className="space-y-2"
            >
              {filteredPlayers.map((player, index) => (
                <div
                  key={player.id}
                  {...getItemProps(index)}
                  className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center group"
                >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* 드래그 핸들 */}
                        <div
                          {...getDragHandleProps(index)}
                          className="p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing touch-target"
                          aria-label="드래그하여 순서 변경"
                        >
                          <GripVertical size={20} />
                        </div>

                        {/* 프로필 사진 또는 기본 아이콘 */}
                        {player.photo ? (
                          <img
                            src={player.photo}
                            alt={player.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${player.gender === 'MALE' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                              <User size={20} />
                          </div>
                        )}
                        <button
                          onClick={() => setEditPlayer(player)}
                          className="flex-1 min-w-0 text-left"
                          aria-label={`${player.name} 선수 정보 수정`}
                        >
                            <div className="font-bold text-slate-800 truncate">
                              {highlightMatch(player.name, searchQuery)}
                            </div>
                            <div className="text-xs text-slate-400 font-medium">
                              {player.gender === 'MALE' ? '남성' : '여성'}
                              {player.bonusPoints ? ` · 보너스 ${player.bonusPoints}점` : ''}
                            </div>
                        </button>
                    </div>
                    <button
                        onClick={() => setDeletePlayerId(player.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all touch-target"
                        aria-label={`${player.name} 선수 삭제`}
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
              ))}
            </div>
        )}
      </div>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deletePlayerId}
        title="선수 삭제"
        message="이 선수를 삭제하시겠습니까? 리그 데이터에서도 제외됩니다."
        confirmText="삭제"
        variant="danger"
        onConfirm={() => deletePlayerId && handleDelete(deletePlayerId)}
        onCancel={() => setDeletePlayerId(null)}
      />

      {/* Player Edit Modal */}
      <PlayerEditModal
        isOpen={!!editPlayer}
        player={editPlayer}
        onSave={handleSaveEdit}
        onCancel={() => setEditPlayer(null)}
      />
    </main>
  );
}
