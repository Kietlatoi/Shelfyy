import { useState } from 'react'
import { forgotPassword } from '../api/authApi'
import { BrandLogo } from '../components/BrandLogo'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')
    try {
      const response = await forgotPassword(email)
      setMessage(response?.message || 'Nếu email tồn tại, hệ thống đã gửi link đặt lại mật khẩu.')
    } catch (err) {
      setError(err.message || 'Không gửi được email đặt lại mật khẩu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-surface-container-low flex items-center justify-center px-4">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-border-subtle">
        <BrandLogo className="mb-6" markClassName="h-10 w-10" tagline="Tủ đồ AI" />
        <h1 className="text-2xl font-bold text-primary mb-2">Quên mật khẩu</h1>
        <p className="text-sm text-text-muted mb-6">
          Nhập email tài khoản, hệ thống sẽ gửi link đặt lại mật khẩu cho bạn.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-700">Email</span>
            <input
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[#b83c44] focus:ring-[#b83c44]/20"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <button
            className="w-full rounded-full bg-[#b83c44] px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
          </button>
        </form>

        {message && <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-700">{message}</p>}
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p>}

        <a className="mt-6 inline-block text-sm font-semibold text-[#b83c44]" href="#/">
          Quay lại đăng nhập
        </a>
      </section>
    </main>
  )
}
