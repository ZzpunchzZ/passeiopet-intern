import React from 'react';
import { Dog } from 'lucide-react';

interface PetAvatarProps {
  photoUrl?: string;
  petName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

const iconSizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function PetAvatar({ photoUrl, petName, size = 'md', className = '' }: PetAvatarProps) {
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizeClasses[size];

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={petName}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 ${className}`}
    >
      <Dog className={`${iconSize} text-amber-600`} />
    </div>
  );
}
