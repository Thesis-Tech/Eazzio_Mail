import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[#E2E8F0] dark:bg-[#2A2E37] ${className}`}
      aria-hidden="true"
    />
  );
};

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ lines = 1, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton
          key={idx}
          className={`h-3.5 ${idx === lines - 1 && lines > 1 ? 'w-4/5' : 'w-full'}`}
        />
      ))}
    </div>
  );
};

export const SkeletonAvatar: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };
  return <Skeleton className={`rounded-full shrink-0 ${sizeClasses[size]} ${className}`} />;
};

export const SkeletonMailRow: React.FC = () => {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E2E8F0] dark:border-[#2A2E37]">
      <Skeleton className="w-4 h-4 rounded" />
      <Skeleton className="w-4 h-4 rounded" />
      <Skeleton className="w-24 h-4 rounded" />
      <div className="flex-1 min-w-0">
        <Skeleton className="w-2/3 h-4 rounded mb-1" />
        <Skeleton className="w-1/2 h-3 rounded" />
      </div>
      <Skeleton className="w-12 h-3 rounded shrink-0" />
    </div>
  );
};

export const SkeletonMailList: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="w-full flex-1 divide-y divide-[#E2E8F0] dark:divide-[#2A2E37]">
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonMailRow key={idx} />
      ))}
    </div>
  );
};

export const SkeletonConversation: React.FC = () => {
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-3/4 rounded-lg" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>

      {/* Message Card */}
      <div className="p-5 rounded-2xl border border-[#E2E8F0] dark:border-[#2A2E37] bg-white dark:bg-[#16181D] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SkeletonAvatar size="md" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-48 rounded" />
            </div>
          </div>
          <Skeleton className="h-3 w-16 rounded" />
        </div>

        <div className="pt-3 space-y-2.5">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-11/12 rounded" />
          <Skeleton className="h-4 w-4/5 rounded" />
          <Skeleton className="h-4 w-2/3 rounded" />
        </div>
      </div>
    </div>
  );
};
