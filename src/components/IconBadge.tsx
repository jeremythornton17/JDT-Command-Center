import React from 'react';
import { LucideIcon } from 'lucide-react';

interface IconBadgeProps {
  icon: LucideIcon;
  colorClass?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export function IconBadge({ icon: Icon, colorClass = 'text-jdt-primary', size = 'md', animated = false, variant = 'badge' }: IconBadgeProps & { variant?: 'badge' | 'sidebar' | 'transparent' }) {
  const sizeClasses = {
    xs: 'w-6 h-6 p-1 rounded-md',
    sm: 'w-8 h-8 p-1.5 rounded-md',
    md: 'w-10 h-10 p-2 rounded-lg',
    lg: 'w-12 h-12 p-2.5 rounded-lg',
    xl: 'w-16 h-16 p-3 rounded-xl'
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const variantClasses = {
    badge: 'bg-[#FDFAF7] border border-jdt-olive/30 shadow-sm',
    sidebar: 'bg-white/10 border border-white/20 shadow-inner',
    transparent: 'bg-transparent border border-transparent'
  };

  return (
    <div className={`
      relative flex items-center justify-center shrink-0
      ${variantClasses[variant]}
      ${sizeClasses[size]}
    `}>
      <Icon className={`
        ${iconSizes[size]} 
        ${colorClass}
        ${animated ? 'animate-[bounce_1.5s_infinite]' : ''}
      `} />
      {/* Subtle accent dot to give it that 'field badge' look */}
      {variant === 'badge' && (
        <span className="absolute -top-px -right-px w-1.5 h-1.5 rounded-full bg-jdt-olive/40 border border-[#FDFAF7]"></span>
      )}
    </div>
  );
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  variant?: 'outline' | 'ghost' | 'solid';
  colorClass?: string;
  size?: 'sm' | 'md';
}

export function IconButton({ icon: Icon, variant = 'outline', colorClass = 'text-jdt-primary', size = 'md', className = '', ...props }: IconButtonProps) {
  const sizeClasses = {
    sm: 'w-7 h-7 p-1 rounded-md',
    md: 'w-9 h-9 p-1.5 rounded-lg'
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4'
  };

  const variantClasses = {
    outline: 'bg-[#FDFAF7] border border-jdt-olive/30 hover:border-jdt-olive/60 shadow-sm hover:shadow',
    ghost: 'hover:bg-[#FDFAF7]',
    solid: 'bg-jdt-primary text-white border border-transparent hover:bg-jdt-dark shadow-sm'
  };

  const currentIconColor = variant === 'solid' ? 'text-white' : colorClass;

  return (
    <button 
      className={`
        flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-jdt-olive/50
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
      {...props}
    >
      <Icon className={`${iconSizes[size]} ${currentIconColor}`} />
    </button>
  );
}
