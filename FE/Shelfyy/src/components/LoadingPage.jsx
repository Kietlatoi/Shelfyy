import { LogoMark } from './BrandLogo'

export function LoadingPage() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/90 backdrop-blur-md">
      <div className="relative flex flex-col items-center gap-6">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-4 border-rose-100"></div>
          <div className="absolute inset-0 rounded-full border-4 border-rose-600 border-t-transparent animate-spin"></div>
          <div className="absolute inset-4 rounded-full bg-rose-50 flex items-center justify-center">
            <LogoMark className="h-14 w-14 animate-pulse" title="Shelfy" />
          </div>
        </div>
        
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-gray-900 tracking-wide">Shelfy</h2>
          <div className="flex items-center gap-1.5 justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-bounce" style={{ animationDelay: '300ms' }}></span>
            <span className="text-sm font-medium text-gray-500 ml-1">Đang chuyển trang...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
