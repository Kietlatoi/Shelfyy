import { useState } from 'react'
import { BrandLogo } from './BrandLogo'
import { MaterialIcon } from './MaterialIcon'
import { LoadingButton } from './LoadingButton'

const MIN_PASSWORD_LENGTH = 6
const MIN_FULLNAME_LENGTH = 2

function PasswordField({ label, value, onChange, disabled, minLength, autoComplete }) {
  const [visible, setVisible] = useState(false)
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-gray-700">{label}</span>
      <div className="relative">
        <input
          className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-11 text-sm focus:border-[#b83c44] focus:ring-[#b83c44]/20"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required
          disabled={disabled}
          minLength={minLength}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          tabIndex={-1}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <MaterialIcon name={visible ? 'visibility_off' : 'visibility'} size={20} />
        </button>
      </div>
    </label>
  )
}

export function LandingLoginModal({ onClose, onSubmit, isLoading = false, error = '' }) {
  // FIX #13: Hardcode credentials trong source code sẽ bị lộ khi deploy
  // production (bundle JS ai cũng đọc được). Chỉ prefill demo credentials
  // khi build ở chế độ dev (import.meta.env.DEV), production luôn để trống.
  const isDev = import.meta.env.DEV
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState(isDev ? 'demo@shelfy.app' : '')
  const [password, setPassword] = useState(isDev ? '123456' : '')
  const [confirmPassword, setConfirmPassword] = useState(isDev ? '123456' : '')
  const [rememberMe, setRememberMe] = useState(false)
  const [localError, setLocalError] = useState('')

  const isRegister = mode === 'register'

  const switchMode = (nextMode) => {
    if (isLoading) return
    setMode(nextMode)
    setLocalError('')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setLocalError('')

    if (isRegister) {
      if (fullName.trim().length < MIN_FULLNAME_LENGTH) {
        setLocalError(`Họ tên phải có ít nhất ${MIN_FULLNAME_LENGTH} ký tự.`)
        return
      }
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
        setLocalError('Email không hợp lệ.')
        return
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        setLocalError(`Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`)
        return
      }
      if (password !== confirmPassword) {
        setLocalError('Mật khẩu nhập lại không khớp.')
        return
      }
      onSubmit({ mode: 'register', fullName: fullName.trim(), email: email.trim(), password })
      return
    }

    onSubmit({ mode: 'login', email: email.trim(), password, rememberMe })
  }

  const displayError = localError || error

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
            <BrandLogo
              className="mb-4"
              markClassName="h-9 w-9"
              tagline="Tủ đồ AI"
              textClassName="max-w-[150px]"
            />
            <h2 className="text-2xl font-bold text-[#111827]" id="landing-login-title">
              {isRegister ? 'Tạo tài khoản mới' : 'Đăng nhập tài khoản'}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {isRegister
                ? 'Tạo tài khoản để bắt đầu quản lý tủ đồ cùng gợi ý AI.'
                : 'Vào tủ đồ của bạn để xem gợi ý AI và lịch trình hôm nay.'}
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

        {/* Tab chuyển đổi Đăng nhập / Đăng ký */}
        <div className="mb-6 flex rounded-full bg-gray-100 p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => switchMode('login')}
            disabled={isLoading}
            className={`flex-1 rounded-full py-2 transition-colors ${
              !isRegister ? 'bg-white text-[#b83c44] shadow' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            disabled={isLoading}
            className={`flex-1 rounded-full py-2 transition-colors ${
              isRegister ? 'bg-white text-[#b83c44] shadow' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Đăng ký
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {isRegister && (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">Họ và tên</span>
              <input
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[#b83c44] focus:ring-[#b83c44]/20"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isLoading}
                minLength={MIN_FULLNAME_LENGTH}
                maxLength={100}
                placeholder="Nguyễn Văn A"
              />
            </label>
          )}

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

          <div>
            <PasswordField
              label="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              minLength={isRegister ? MIN_PASSWORD_LENGTH : undefined}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
            {isRegister && (
              <p className="mt-1.5 text-xs text-gray-400">
                Tối thiểu {MIN_PASSWORD_LENGTH} ký tự.
              </p>
            )}
          </div>

          {isRegister && (
            <PasswordField
              label="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
            />
          )}

          {!isRegister && (
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
          )}

          {displayError && (
            <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">
              {displayError}
            </p>
          )}

          <LoadingButton
            isLoading={isLoading}
            className="w-full rounded-full bg-[#b83c44] px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            type="submit"
          >
            {isLoading
              ? (isRegister ? 'Đang tạo tài khoản...' : 'Đang xác thực...')
              : (isRegister ? 'Đăng ký' : 'Đăng nhập')}
          </LoadingButton>

          <p className="text-center text-sm text-gray-500">
            {isRegister ? (
              <>
                Đã có tài khoản?{' '}
                <button type="button" className="font-semibold text-[#b83c44]" onClick={() => switchMode('login')} disabled={isLoading}>
                  Đăng nhập
                </button>
              </>
            ) : (
              <>
                Chưa có tài khoản?{' '}
                <button type="button" className="font-semibold text-[#b83c44]" onClick={() => switchMode('register')} disabled={isLoading}>
                  Đăng ký ngay
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  )
}
