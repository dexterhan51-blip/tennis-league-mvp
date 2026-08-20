'use client';

import React from 'react';

interface ScoreInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
}

export default function ScoreInput({
  value,
  onChange,
  disabled = false,
  label,
}: ScoreInputProps) {
  const scores = [0, 1, 2, 3, 4, 5, 6];

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-xs font-semibold text-ink-mute">{label}</label>
      )}
      <div className="flex gap-1 flex-wrap">
        {scores.map((score) => {
          const isSelected = value === score;
          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              disabled={disabled}
              className={`
                w-11 h-11 rounded-lg font-bold text-lg transition-all touch-target
                ${isSelected
                  ? 'bg-accent text-white scale-105'
                  : 'bg-card-soft text-ink-soft hover:bg-line'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
              `}
              aria-label={`점수 ${score}`}
              aria-pressed={isSelected}
            >
              {score}
            </button>
          );
        })}
      </div>
    </div>
  );
}
