import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Player, Gender } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/contexts/ToastContext';
import { safeGetAsync, safeSetAsync } from '@/lib/storage';
import { PlayersArraySchema } from '@/lib/schemas';

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

  // Load from IndexedDB
  useEffect(() => {
    safeGetAsync(PLAYERS_KEY, PlayersArraySchema).then(data => {
      if (data) setPlayers(data);
      setIsLoading(false);
    });
  }, []);

  // Auto-save to IndexedDB
  useEffect(() => {
    if (isLoading) return;
    safeSetAsync(PLAYERS_KEY, players);
  }, [players, isLoading]);

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
