export default function AccountDeletionPage() {
  const requestUrl = 'mailto:toilakiet24@gmail.com?subject=Y%C3%AAu%20c%E1%BA%A7u%20x%C3%B3a%20t%C3%A0i%20kho%E1%BA%A3n%20Shelfy&body=Email%20t%C3%A0i%20kho%E1%BA%A3n%20Shelfy%3A%20'

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-800">
      <article className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-sm">
        <a className="text-sm font-semibold text-indigo-600" href="/">← Về Shelfy</a>
        <h1 className="mt-6 text-3xl font-bold text-slate-950">Yêu cầu xóa tài khoản Shelfy</h1>
        <p className="mt-4 leading-7">Bạn có thể gửi yêu cầu xóa tài khoản mà không cần cài lại ứng dụng. Hãy dùng đúng địa chỉ email đã đăng ký Shelfy để chúng tôi xác minh chủ tài khoản.</p>
        <a className="mt-7 inline-flex rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white" href={requestUrl}>
          Gửi yêu cầu xóa tài khoản
        </a>

        <section className="mt-9 border-t border-slate-200 pt-7">
          <h2 className="text-xl font-semibold">Dữ liệu sẽ được xử lý</h2>
          <p className="mt-2 leading-7">Hồ sơ, tủ đồ, ảnh, gợi ý và lịch sử sử dụng thuộc tài khoản sẽ bị xóa sau khi xác minh. Dữ liệu giao dịch cần cho đối soát và nghĩa vụ tài chính có thể được giữ tối đa 10 năm dưới dạng đã ẩn danh.</p>
          <p className="mt-4 leading-7">Trong ứng dụng, bạn cũng có thể vào <strong>Cá nhân → Xóa tài khoản</strong> để xóa ngay bằng mật khẩu hiện tại.</p>
        </section>
      </article>
    </main>
  )
}
