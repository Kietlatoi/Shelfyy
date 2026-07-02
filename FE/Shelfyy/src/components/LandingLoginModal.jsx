import { useState } from 'react'
import { MaterialIcon } from './MaterialIcon'
import { LoadingButton } from './LoadingButton'

export function LandingLoginModal({ onClose, onSubmit, isLoading = false, error = '' }) {
  // FIX #13: Hardcode credentials trong source code sẽ bị lộ khi deploy
  // production (bundle JS ai cũng đọc được). Chỉ prefill demo credentials
  // khi build ở chế độ dev (import.meta.env.DEV), production luôn để trống.
  const isDev = import.meta.env.DEV
  const [email, setEmail] = useState(isDev ? 'demo@shelfy.app' : '')
  const [password, setPassword] = useState(isDev ? '123456' : '')
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit({ email: email.trim(), password, rememberMe })
  }

  return (
    <div
      aria-labelledby="landing-login-title"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#b83c44]">
              Shelfy
            </p>
            <h2 className="text-2xl font-bold text-[#111827]" id="landing-login-title">
              Đăng nhập tài khoản
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Vào tủ đồ của bạn để xem gợi ý AI và lịch trình hôm nay.
            </p>
          </div>
          <button
            aria-label="Đóng đăng nhập"
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            onClick={onClose}
            type="button"
            disabled={isLoading}
          >
            <MaterialIcon name="close" />
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-700">Email</span>
            <input
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[#b83c44] focus:ring-[#b83c44]/20"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-700">Mật khẩu</span>
            <input
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[#b83c44] focus:ring-[#b83c44]/20"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </label>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
              <input
                className="rounded border-gray-300 text-[#b83c44] focus:ring-[#b83c44]"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
              />
              Ghi nhớ đăng nhập
            </label>
            <a className="font-semibold text-[#b83c44]" href="#/forgot-password">
              Quên mật khẩu?
            </a>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">
              {error}
            </p>
          )}

          <LoadingButton
            isLoading={isLoading}
            className="w-full rounded-full bg-[#b83c44] px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            type="submit"
          >
            {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
          </LoadingButton>
        </form>
      </div>
    </div>
  )
}