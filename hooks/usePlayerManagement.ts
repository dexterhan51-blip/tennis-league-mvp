import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Player, Gender } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/contexts/ToastContext';
import { safeGetAsync, safeSetAsync } from '@/lib/storage';
import { PlayersArraySchema } from '@/lib/schemas';
import { fetchMembers, saveMembers } from '@/lib/seasonApi';

const PLAYERS_KEY = 'tennis-players';

export function usePlayerManagement() {
  const { showToast } = useToast();

  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('MALE');
  const [photo, setPhoto] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletePlayerId, setDeletePlayerId] = useState<string | null>(null);
  const [editPlayer, setEditPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 회원 명단의 원본은 서버다. 기기 저장분은 오프라인일 때 보여 줄 사본.
  const lastSavedRef = useRef<string>('');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const members = await fetchMembers();
        if (cancelled) return;
        lastSavedRef.current = JSON.stringify(members);
        setPlayers(members);
      } catch {
        const cached = await safeGetAsync(PLAYERS_KEY, PlayersArraySchema);
        if (cancelled) return;
        if (cached) {
          lastSavedRef.current = JSON.stringify(cached);
          setPlayers(cached);
        }
        showToast('서버에서 회원 명단을 불러오지 못했습니다. 이 기기에 저장된 명단을 보여줍니다.', 'warning');
      }
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  // 바뀌면 서버에 저장 (불러온 직후처럼 내용이 같을 때는 보내지 않는다)
  useEffect(() => {
    if (isLoading) return;
    const snapshot = JSON.stringify(players);
    if (snapshot === lastSavedRef.current) return;
    lastSavedRef.current = snapshot;
    safeSetAsync(PLAYERS_KEY, players);
    saveMembers(players).catch(() => {
      lastSavedRef.current = '';
      showToast('회원 명단을 서버에 저장하지 못했습니다. 운영진 코드와 네트워크를 확인해주세요.', 'error');
    });
  }, [players, isLoading, showToast]);

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players;
    const query = searchQuery.toLowerCase();
    return players.filter(p => p.name.toLowerCase().includes(query));
  }, [players, searchQuery]);

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
          if (!ctx) { reject(new Error('Canvas context not available')); return; }
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
    } catch {
      showToast('이미지 처리에 실패했습니다.', 'error');
    }
    e.target.value = '';
  }, [resizeImage, showToast]);

  const handleRemovePhoto = useCallback(() => setPhoto(null), []);

  const handleAdd = useCallback(() => {
    if (!name.trim()) {
      showToast('이름을 입력해주세요.', 'warning');
      return;
    }
    const newPlayer: Player = {
      id: uuidv4(),
      name: name.trim(),
      gender,
      photo: photo || undefined,
    };
    setPlayers(prev => [...prev, newPlayer]);
    setName('');
    setPhoto(null);
    showToast(`${newPlayer.name} 선수가 등록되었습니다.`, 'success');
  }, [name, gender, photo, showToast]);

  const handleDelete = useCallback((id: string) => {
    const player = players.find(p => p.id === id);
    setPlayers(prev => prev.filter(p => p.id !== id));
    setDeletePlayerId(null);
    if (player) showToast(`${player.name} 선수가 삭제되었습니다.`, 'success');
  }, [players, showToast]);

  const handleSaveEdit = useCallback((updatedPlayer: Player) => {
    setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
    setEditPlayer(null);
    showToast(`${updatedPlayer.name} 선수 정보가 수정되었습니다.`, 'success');
  }, [showToast]);

  return {
    players,
    setPlayers,
    name,
    setName,
    gender,
    setGender,
    photo,
    setPhoto,
    searchQuery,
    setSearchQuery,
    deletePlayerId,
    setDeletePlayerId,
    editPlayer,
    setEditPlayer,
    isLoading,
    fileInputRef,
    cameraInputRef,
    filteredPlayers,
    handleFileSelect,
    handleRemovePhoto,
    handleAdd,
    handleDelete,
    handleSaveEdit,
  };
}
