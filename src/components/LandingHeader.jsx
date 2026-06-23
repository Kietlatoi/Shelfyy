export function LandingHeader({ data, onLoginClick }) {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-10 lg:gap-32">
          <a data-purpose="logo" href="/">
            <img alt="Acloset" className="h-8" src={data.logo} />
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            {data.nav.map((item) => (
              <a className="hover:text-black" href="#" key={item}>
                {item}
              </a>
            ))}
          </nav>
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
