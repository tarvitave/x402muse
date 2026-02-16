'use client';

import { useState } from 'react';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showStrength?: boolean;
}

export default function PasswordInput({
  value,
  onChange,
  placeholder = 'Enter password',
  showStrength = false,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  const strength = getStrength(value);

  return (
    <div>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 pr-16 text-white"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs px-2 py-1"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {showStrength && value.length > 0 && (
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1 h-1 rounded bg-gray-700">
            <div
              className={`h-1 rounded transition-all ${
                strength === 'strong' ? 'bg-green-500 w-full' :
                strength === 'medium' ? 'bg-yellow-500 w-2/3' :
                'bg-red-500 w-1/3'
              }`}
            />
          </div>
          <span className="text-xs text-gray-400 capitalize">{strength}</span>
        </div>
      )}
    </div>
  );
}

function getStrength(password: string): 'weak' | 'medium' | 'strong' {
  if (password.length < 8) return 'weak';
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  if (password.length >= 12 && hasNumber && hasSpecial) return 'strong';
  if (hasNumber || hasSpecial) return 'medium';
  return 'weak';
}
