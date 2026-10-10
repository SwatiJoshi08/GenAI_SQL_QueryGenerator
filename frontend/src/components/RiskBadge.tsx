import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, ShieldX } from 'lucide-react';
import { RiskLevel } from '../types';

interface RiskBadgeProps {
  level?: RiskLevel | string;
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level = 'low',
  showIcon = true,
  className = '',
  size = 'md',
}) => {
  const normalizedLevel = (level || 'low').toLowerCase() as RiskLevel;

  const config: Record<
    RiskLevel,
    { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    low: {
      label: 'Low Risk',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      icon: ShieldCheck,
    },
    medium: {
      label: 'Medium Risk',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      icon: AlertTriangle,
    },
    high: {
      label: 'High Risk',
      bg: 'bg-orange-500/10',
      text: 'text-orange-400',
      border: 'border-orange-500/20',
      icon: ShieldAlert,
    },
    blocked: {
      label: 'Blocked / Dangerous',
      bg: 'bg-rose-500/15',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      icon: ShieldX,
    },
  };

  const current = config[normalizedLevel] || config.low;
  const IconComponent = current.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border ${current.bg} ${current.text} ${current.border} ${sizeClasses[size]} ${className}`}
    >
      {showIcon && <IconComponent className={iconSizes[size]} />}
      <span>{current.label}</span>
    </span>
  );
};
