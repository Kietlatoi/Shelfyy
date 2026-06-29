import React, { useState, useEffect } from 'react';

export function LoadingComponent({ children, delay = 600, className = '' }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center p-12 space-y-4 w-full rounded-2xl bg-gray-50/50 border border-gray-100/80 min-h-[250px] animate-pulse ${className}`}>
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-rose-100"></div>
          <div className="absolute inset-0 rounded-full border-2 border-rose-500 border-t-transparent animate-spin"></div>
        </div>
        <p className="text-sm text-gray-400 font-medium">Đang tải cấu phần AI...</p>
      </div>
    );
  }

  return <>{children}</>;
}
