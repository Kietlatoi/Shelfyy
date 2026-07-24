import { useEffect, useRef } from 'react'
import { MaterialIcon } from './MaterialIcon'

export function LandingAppNoticeModal({ onClose }) {
  const closeButtonRef = useRef(null)

  useEffect(() => {
    closeButtonRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      aria-labelledby="app-notice-title"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4"
      role="dialog"
    >
      <button
        aria-label="Đóng thông báo tải ứng dụng"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
        type="button"
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl shadow-black/20">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff1f2] text-[#b83c44]">
          <MaterialIcon name="phone_iphone" size={28} />
        </div>
        <h2 id="app-notice-title" className="mt-4 text-2xl font-bold text-[#111827]">
          Ứng dụng mobile sắp ra mắt
        </h2>
        <p className="mt-3 text-base leading-7 text-gray-600">
          Hiện tại ứng dụng mobile app của chúng tôi đang trong giai đoạn phát triễn và xin được giấy phép từ CH Play.
        </p>
        <button
          className="mt-6 w-full rounded-full bg-[#b83c44] px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
          onClick={onClose}
          ref={closeButtonRef}
          type="button"
        >
          Đã hiểu
        </button>
      </div>
    </div>
  )
}
