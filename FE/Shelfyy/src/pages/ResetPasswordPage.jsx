import { useMemo, useState } from 'react'
import { resetPassword } from '../api/authApi'
import { BrandLogo } from '../components/BrandLogo'
import { goToRootRoute } from '../utils/navigation'

export function ResetPasswordPage() {
  const token = useMemo(() => {
    const raw = window.location.hash.replace(/^#\/reset-password\??/, '')
    return new URLSearchParams(raw).get('token')
  }, [])

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!token) {
      setError('Link đặt lại mật khẩu không hợp lệ hoặc thiếu token.')
      return
    }
    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }

    setLoading(true)
    try {
      const response = await resetPassword({ token, newPassword })
      setMessage(response?.message || 'Đặt lại mật khẩu thành công.')
      setTimeout(() => {
        goToRootRoute()
      }, 1500)
    } catch (err) {
      setError(err.message || 'Không đặt lại được mật khẩu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-surface-container-low flex items-center justify-center px-4">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-border-subtle">
        <BrandLogo className="mb-6" markClassName="h-10 w-10" tagline="Tủ đồ AI" />
        <h1 className="text-2xl font-bold text-primary mb-2">Đặt lại mật khẩu</h1>
        <p className="text-sm text-text-muted mb-6">Nhập mật khẩu mới cho tài khoản của bạn.</p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-700">Mật khẩu mới</span>
            <input
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[#b83c44] focus:ring-[#b83c44]/20"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-700">Xác nhận mật khẩu</span>
            <input
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[#b83c44] focus:ring-[#b83c44]/20"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </label>
          <button
            className="w-full rounded-full bg-[#b83c44] px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            type="submit"
            disabled={loading || !token}
          >
            {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
          </button>
        </form>

        {message && <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-700">{message}</p>}
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p>}
      </section>
    </main>
  )
}
