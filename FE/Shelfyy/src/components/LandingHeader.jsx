import { BrandLogo } from "./BrandLogo";

export function LandingHeader({ data, onDownloadClick, onLoginClick }) {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-10 lg:gap-32">
          <a data-purpose="logo" href="/" aria-label="Shelfy">
            <BrandLogo
              markClassName="h-10 w-10"
              tagline="Tủ đồ AI"
              textClassName="max-w-[140px]"
            />
          </a>
        </div>
        <div className="flex items-center gap-4">
          {data.actions.map((action) =>
            action === "Đăng nhập" ? (
              <button
                className="bg-[#b83c44] text-white px-4 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
                key={action}
                onClick={onLoginClick}
                type="button"
              >
                {action}
              </button>
            ) : action === "Tải ứng dụng" ? (
              <button
                className="bg-[#b83c44] text-white px-4 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
                key={action}
                onClick={onDownloadClick}
                type="button"
              >
                {action}
              </button>
            ) : (
              <a
                className="bg-[#b83c44] text-white px-4 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
                href="#"
                key={action}
              >
                {action}
              </a>
            ),
          )}
        </div>
      </div>
    </header>
  );
}
