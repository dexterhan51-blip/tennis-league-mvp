'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Camera, Image as ImageIcon, Trash2 } from 'lucide-react';
import type { Player, Gender } from '@/types';

interface PlayerEditModalProps {
  isOpen: boolean;
  player: Player | null;
  onSave: (player: Player) => void;
  onCancel: () => void;
}

export default function PlayerEditModal({
  isOpen,
  player,
  onSave,
  onCancel,
}: PlayerEditModalProps) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('MALE');
  const [photo, setPhoto] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (player) {
      setName(player.name);
      setGender(player.gender);
      setPhoto(player.photo);
    }
  }, [player]);

  const resizeImage = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handlePhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const resized = await resizeImage(file);
      setPhoto(resized);
    }
  }, [resizeImage]);

  const handleRemovePhoto = useCallback(() => {
    setPhoto(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleSave = useCallback(() => {
    if (!player || !name.trim()) return;

    // bonusPoints 등 나머지 필드는 ...player 스프레드로 기존 값 유지
    onSave({
      ...player,
      name: name.trim(),
      gender,
      photo,
    });
  }, [player, name, gender, photo, onSave]);

  if (!isOpen || !player) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-player-title"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 id="edit-player-title" className="text-lg font-bold text-slate-900">
            선수 정보 수정
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors touch-target"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Photo */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {photo ? (
                <img
                  src={photo}
                  alt={name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-slate-200"
                />
              ) : (
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center ${
                    gender === 'MALE' ? 'bg-blue-100' : 'bg-pink-100'
                  }`}
                >
                  <span className="text-3xl">
                    {gender === 'MALE' ? '👨' : '👩'}
                  </span>
                </div>
              )}
              {photo && (
                <button
                  onClick={handleRemovePhoto}
                  className="absolute -top-1 -right-1 p-1.5 bg-red-500 text-white rounded-full shadow-lg touch-target"
                  aria-label="사진 삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors touch-target"
              >
                <ImageIcon className="w-4 h-4" />
                앨범에서 선택
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-clay-500 focus:border-clay-500"
              placeholder="선수 이름"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              성별
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setGender('MALE')}
                className={`flex-1 py-3 rounded-xl font-medium transition-colors touch-target ${
                  gender === 'MALE'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                남성
              </button>
              <button
                onClick={() => setGender('FEMALE')}
                className={`flex-1 py-3 rounded-xl font-medium transition-colors touch-target ${
                  gender === 'FEMALE'
                    ? 'bg-pink-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                여성
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-slate-200">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors touch-target"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-clay-600 hover:bg-clay-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-target"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
