export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-800">
      <article className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm">
        <a className="text-sm font-semibold text-indigo-600" href="/">← Về Shelfy</a>
        <h1 className="mt-6 text-3xl font-bold text-slate-950">Chính sách quyền riêng tư Shelfy</h1>
        <p className="mt-2 text-sm text-slate-500">Cập nhật ngày 09/10/2026</p>

        <div className="mt-8 space-y-7 leading-7">
          <section>
            <h2 className="text-xl font-semibold">Dữ liệu Shelfy xử lý</h2>
            <p className="mt-2">Shelfy xử lý email, tên hiển thị, ảnh đại diện, ảnh trang phục, dữ liệu tủ đồ, vị trí gần đúng khi bạn cho phép, lịch sử thử đồ AI và thông tin giao dịch cần thiết để vận hành ứng dụng.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Mục đích và dịch vụ hỗ trợ</h2>
            <p className="mt-2">Dữ liệu được dùng để đăng nhập, đồng bộ tủ đồ, cung cấp thời tiết, tạo gợi ý, thử đồ AI, hỗ trợ tài khoản và ghi nhận thanh toán. Shelfy sử dụng Firebase, Cloudinary, Cloudflare, Open-Meteo, Replicate và nhà cung cấp thanh toán được hiển thị trong ứng dụng.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Lưu trữ và xóa dữ liệu</h2>
            <p className="mt-2">Dữ liệu tài khoản được giữ khi tài khoản còn hoạt động. Bạn có thể xóa tài khoản trong ứng dụng hoặc gửi yêu cầu tại trang xóa tài khoản. Hồ sơ và ảnh sẽ bị xóa; dữ liệu tài chính bắt buộc lưu giữ có thể được giữ tối đa 10 năm dưới dạng đã ẩn danh.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Liên hệ</h2>
            <p className="mt-2">Email: <a className="text-indigo-600 underline" href="mailto:toilakiet24@gmail.com">toilakiet24@gmail.com</a></p>
          </section>
        </div>
      </article>
    </main>
  )
}
