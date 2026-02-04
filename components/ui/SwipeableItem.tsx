'use client';

import React, { useRef, useState, useCallback, ReactNode } from 'react';
import { Trash2 } from 'lucide-react';

interface SwipeableItemProps {
  children: ReactNode;
  onDelete: () => void;
  deleteLabel?: string;
  threshold?: number;
}

export default function SwipeableItem({
  children,
  onDelete,
  deleteLabel = '삭제',
  threshold = 80,
}: SwipeableItemProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isDraggingRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isDraggingRef.current = false;
    setIsSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - startXRef.current;
    const deltaY = currentY - startYRef.current;

    // Determine if horizontal swipe
    if (!isDraggingRef.current) {
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        isDraggingRef.current = true;
      } else if (Math.abs(deltaY) > 10) {
        setIsSwiping(false);
        return;
      }
    }

    if (isDraggingRef.current) {
      // Only allow left swipe (negative deltaX)
      const newTranslate = Math.min(0, Math.max(-threshold - 20, deltaX));
      setTranslateX(newTranslate);
    }
  }, [isSwiping, threshold]);

  const handleTouchEnd = useCallback(() => {
    setIsSwiping(false);
    isDraggingRef.current = false;

    if (translateX < -threshold) {
      // Show delete button
      setTranslateX(-threshold);
      setShowDelete(true);
    } else {
      // Reset position
      setTranslateX(0);
      setShowDelete(false);
    }
  }, [translateX, threshold]);

  const handleClose = useCallback(() => {
    setTranslateX(0);
    setShowDelete(false);
  }, []);

  const handleDelete = useCallback(() => {
    onDelete();
    handleClose();
  }, [onDelete, handleClose]);

  return (
    <div className="relative overflow-hidden" ref={containerRef}>
      {/* Delete button background */}
      <div
        className={`absolute inset-y-0 right-0 flex items-center justify-end bg-red-500 transition-opacity ${
          showDelete ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ width: threshold }}
      >
        <button
          onClick={handleDelete}
          className="h-full px-4 flex flex-col items-center justify-center text-white touch-target"
          aria-label={deleteLabel}
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-xs mt-1">{deleteLabel}</span>
        </button>
      </div>

      {/* Swipeable content */}
      <div
        className={`relative bg-white ${
          isSwiping ? '' : 'transition-transform duration-200'
        }`}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={showDelete ? handleClose : undefined}
      >
        {children}
      </div>
    </div>
  );
}
