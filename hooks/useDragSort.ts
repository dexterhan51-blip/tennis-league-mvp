'use client';

import { useState, useRef, useCallback } from 'react';

interface DragState {
  isDragging: boolean;
  dragIndex: number | null;
  targetIndex: number | null;
}

interface UseDragSortOptions<T> {
  items: T[];
  onReorder: (items: T[]) => void;
}

export function useDragSort<T>({ items, onReorder }: UseDragSortOptions<T>) {
  const [state, setState] = useState<DragState>({
    isDragging: false,
    dragIndex: null,
    targetIndex: null,
  });

  const containerRef = useRef<HTMLElement | null>(null);
  const itemHeightRef = useRef(0);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);

  const setContainerRef = useCallback((element: HTMLElement | null) => {
    containerRef.current = element;
  }, []);

  const handleDragStart = useCallback((index: number, e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startYRef.current = clientY;
    currentYRef.current = clientY;

    // Calculate item height from first item
    if (containerRef.current) {
      const firstItem = containerRef.current.querySelector('[data-drag-item]');
      if (firstItem) {
        itemHeightRef.current = firstItem.getBoundingClientRect().height;
      }
    }

    setState({
      isDragging: true,
      dragIndex: index,
      targetIndex: index,
    });
  }, []);

  const handleDragMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!state.isDragging || state.dragIndex === null) return;

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    currentYRef.current = clientY;

    const deltaY = clientY - startYRef.current;
    const itemsMoved = Math.round(deltaY / (itemHeightRef.current || 50));
    const newTargetIndex = Math.max(0, Math.min(items.length - 1, state.dragIndex + itemsMoved));

    if (newTargetIndex !== state.targetIndex) {
      setState((prev) => ({
        ...prev,
        targetIndex: newTargetIndex,
      }));
    }
  }, [state.isDragging, state.dragIndex, state.targetIndex, items.length]);

  const handleDragEnd = useCallback(() => {
    if (state.dragIndex !== null && state.targetIndex !== null && state.dragIndex !== state.targetIndex) {
      const newItems = [...items];
      const [removed] = newItems.splice(state.dragIndex, 1);
      newItems.splice(state.targetIndex, 0, removed);
      onReorder(newItems);
    }

    setState({
      isDragging: false,
      dragIndex: null,
      targetIndex: null,
    });
  }, [state.dragIndex, state.targetIndex, items, onReorder]);

  const getItemProps = useCallback((index: number) => {
    return {
      'data-drag-item': true,
      'data-drag-index': index,
      style: {
        opacity: state.isDragging && state.dragIndex === index ? 0.5 : 1,
        transform:
          state.isDragging && state.dragIndex !== null && state.targetIndex !== null
            ? index === state.dragIndex
              ? `translateY(${(state.targetIndex - state.dragIndex) * (itemHeightRef.current || 50)}px)`
              : index > state.dragIndex && index <= state.targetIndex
              ? `translateY(-${itemHeightRef.current || 50}px)`
              : index < state.dragIndex && index >= state.targetIndex
              ? `translateY(${itemHeightRef.current || 50}px)`
              : undefined
            : undefined,
        transition: state.isDragging ? 'transform 0.15s ease' : undefined,
      },
    };
  }, [state]);

  const getDragHandleProps = useCallback((index: number) => {
    return {
      onTouchStart: (e: React.TouchEvent) => handleDragStart(index, e),
      onMouseDown: (e: React.MouseEvent) => handleDragStart(index, e),
      style: {
        cursor: state.isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
      },
    };
  }, [state.isDragging, handleDragStart]);

  return {
    ...state,
    setContainerRef,
    getItemProps,
    getDragHandleProps,
    handlers: {
      onTouchMove: handleDragMove,
      onTouchEnd: handleDragEnd,
      onMouseMove: handleDragMove,
      onMouseUp: handleDragEnd,
      onMouseLeave: handleDragEnd,
    },
  };
}
