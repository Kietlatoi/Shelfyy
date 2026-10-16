import { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { MaterialIcon } from '../MaterialIcon';

const periods = [['7d', '7 ngày'], ['30d', '30 ngày'], ['90d', '90 ngày'], ['all', 'Tất cả']];
const panel = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
const input = 'h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold';
const number = (value) => value == null ? '—' : Number(value).toLocaleString('vi-VN');
const money = (value) => `${number(value)} ₫`;
const time = (value) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

function useReport(load, key) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setState({ data: null, error: '', loading: true });
      load().then((data) => active && setState({ data, error: '', loading: false }))
        .catch((error) => active && setState({ data: null, error: error.message, loading: false }));
    }, 0);
    return () => { active = false; clearTimeout(timer); };
    // The request key contains every filter; changes cancel outdated responses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

function ReportHeader({ title, description, period, onPeriod, refresh }) {
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div><p className="mb-1 text-xs font-bold uppercase tracking-widest text-secondary">Shelfy / Quản trị</p><h1 className="text-2xl font-extrabold text-slate-950">{title}</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">{description}</p></div>
    <div className="flex gap-2"><select aria-label="Khoảng thời gian" className={input} value={period} onChange={(e) => onPeriod(e.target.value)}>{periods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className={input} onClick={refresh} aria-label="Làm mới báo cáo"><MaterialIcon name="refresh" size={20} /></button></div>
  </div>;
}

function ReportState({ loading, error, retry }) {
  if (loading) return <p role="status" className={`${panel} py-16 text-center text-sm text-slate-500`}>Đang tổng hợp dữ liệu…</p>;
  if (error) return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error}<button onClick={retry} className="ml-4 font-bold underline">Thử lại</button></div>;
  return null;
}

function Metric({ label, value, note, icon }) {
  return <article className={panel}><div className="flex items-start justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><MaterialIcon name={icon} className="text-secondary" size={22} /></div><p className="mt-3 break-words text-3xl font-extrabold tracking-tight text-slate-950">{value}</p><p className="mt-3 text-xs leading-5 text-slate-500">{note}</p></article>;
}

function RatingSummary({ data }) {
  return <div className="flex flex-wrap gap-6">
    <div className="min-w-28"><p className="text-4xl font-extrabold">{data.average == null ? '—' : data.average.toFixed(2)}<span className="ml-1 text-lg text-slate-400">/ 5</span></p><p className="mt-2 text-sm text-slate-500">{number(data.total)} đánh giá trong kỳ</p></div>
    <div className="min-w-40 flex-1 space-y-2">{[...data.distribution].reverse().map(({ rating, count }) => <div className="flex items-center gap-3 text-xs" key={rating}><span className="w-7 font-bold">{rating} ★</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${data.total ? count / data.total * 100 : 0}%` }} /></div><span className="w-8 text-right tabular-nums">{number(count)}</span><span className="w-10 text-right text-slate-500">{data.total ? Math.round(count / data.total * 100) : 0}%</span></div>)}</div>
  </div>;
}

function TrendChart({ rows, field, title, currency = false }) {
  const max = Math.max(1, ...rows.map((row) => row[field]));
  const format = currency ? money : number;
  const total = rows.reduce((sum, row) => sum + row[field], 0);
  return <article className={`${panel} min-w-0`}>
    <div className="flex items-baseline justify-between gap-3"><h2 className="font-bold">{title}</h2><span className="text-sm font-bold">{format(total)}</span></div>
    <p className="mt-1 text-xs text-slate-500">Theo {rows[0]?.label.length === 7 ? 'tháng' : 'ngày'} · giờ Việt Nam · đơn vị {currency ? 'VND' : 'giao dịch'}</p>
    {rows.length ? <><div className="mt-5 flex gap-2"><div className="flex h-44 w-16 shrink-0 flex-col justify-between text-right text-[10px] text-slate-500"><span>{number(max)}</span><span>{number(max / 2)}</span><span>0</span></div><div className="min-w-0 flex-1 overflow-x-auto pb-2"><div className="flex h-44 items-end gap-1 border-b border-slate-200" style={{ minWidth: rows.length * 12 }}>{rows.map((row) => <div key={row.label} tabIndex={0} aria-label={`${row.label}: ${format(row[field])}`} title={`${row.label}: ${format(row[field])}`} className={`min-w-2 flex-1 rounded-t focus:outline-2 focus:outline-slate-800 ${currency ? 'bg-secondary' : 'bg-slate-700'}`} style={{ height: `${row[field] / max * 100}%`, minHeight: row[field] ? 2 : 0 }} />)}</div></div></div><div className="ml-[72px] mt-1 flex justify-between text-[10px] text-slate-500"><span>{rows[0].label}</span><span>{rows.at(-1).label}</span></div></> : <p className="py-16 text-center text-sm text-slate-500">Chưa có dữ liệu.</p>}
    <details className="mt-4 text-xs text-slate-500"><summary className="cursor-pointer font-semibold">Xem số liệu chi tiết</summary><div className="mt-2 max-h-48 overflow-auto"><table className="w-full text-left"><thead><tr><th className="py-2">Ngày / tháng</th><th>{currency ? 'VND' : 'Giao dịch'}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.label}><td className="py-1">{row.label}</td><td>{format(row[field])}</td></tr>)}</tbody></table></div></details>
  </article>;
}

export function AdminOverview({ onPayment, PaymentTable }) {
  const [period, setPeriod] = useState('30d');
  const [revision, setRevision] = useState(0);
  const refresh = () => setRevision((v) => v + 1);
  const report = useReport(() => adminApi.summary(period), `${period}:${revision}`);
  const data = report.data;
  const previousRevenue = data?.previous?.revenue;
  const trend = previousRevenue > 0 ? `${((data.revenue - previousRevenue) / previousRevenue * 100).toFixed(1)}% so với kỳ trước` : previousRevenue === 0 ? 'Kỳ trước chưa có doanh thu' : 'Toàn bộ thời gian ghi nhận';
  return <section><ReportHeader title="Tổng quan kinh doanh" description="Theo dõi doanh thu, phản hồi và mức sử dụng tính năng trong cùng một kỳ báo cáo." period={period} onPeriod={setPeriod} refresh={refresh} /><ReportState {...report} retry={refresh} />{data && <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon="payments" label="Doanh thu đã thu" value={money(data.revenue)} note={`Chỉ đơn PAID, không tính tiền thử nghiệm. ${trend}.`} />
      <Metric icon="group" label="Người dùng" value={number(data.users)} note={`Tổng hiện tại · ${number(data.newUsers)} đăng ký trong kỳ · loại trừ admin.`} />
      <Metric icon="receipt_long" label="Giao dịch tạo trong kỳ" value={number(data.transactions)} note={`${number(data.successfulTransactions)} đơn thanh toán trong kỳ (theo ngày trả tiền).`} />
      <Metric icon="star" label="Điểm đánh giá" value={data.ratings.average == null ? '— / 5' : `${data.ratings.average.toFixed(2)} / 5`} note={`${number(data.ratings.total)} đánh giá trong Shelfy trong kỳ.`} />
    </div>
    {data.detailsLimited && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Biểu đồ và phân tích giao dịch giới hạn 10.000 bản ghi gần nhất trong kỳ. Các tổng số ở trên vẫn được tính từ toàn bộ dữ liệu.</p>}
    <div className="grid gap-5 lg:grid-cols-2"><TrendChart rows={data.series} field="revenue" title="Doanh thu theo thời gian" currency /><TrendChart rows={data.series} field="transactions" title="Giao dịch theo thời gian" /></div>
    <div className="grid gap-5 lg:grid-cols-2"><article className={panel}><h2 className="mb-5 font-bold">Người dùng đánh giá thế nào?</h2><RatingSummary data={data.ratings} /><p className="mt-4 text-xs text-slate-500">Nguồn: đánh giá trong Shelfy. Chưa có đánh giá sẽ hiển thị “—”.</p></article>
      <article className={panel}><h2 className="font-bold">Hoạt động tính năng trong kỳ</h2><p className="mt-1 text-xs text-slate-500">Số bản ghi được tạo trong kỳ và còn lưu trong hệ thống.</p><dl className="mt-4 divide-y divide-slate-100">{[['wardrobe', 'Món đồ thêm vào tủ'], ['tryOns', 'Kết quả thử đồ AI'], ['suggestions', 'Gợi ý phối đồ'], ['dailyOutfits', 'Trang phục đã ghi nhận']].map(([key, label]) => <div key={key} className="flex items-center justify-between py-3 text-sm"><dt className="text-slate-600">{label}</dt><dd className="font-extrabold">{number(data.activity[key])}</dd></div>)}</dl>{Object.values(data.activity).some((v) => v == null) && <p role="status" className="text-xs text-amber-700">“—”: chưa đọc được dữ liệu, hãy thử làm mới sau.</p>}</article></div>
    <div className="grid gap-5 lg:grid-cols-2"><article className={panel}><h2 className="mb-4 font-bold">Trạng thái đơn tạo trong kỳ</h2><div className="flex flex-wrap gap-2">{data.paymentStatuses.map((row) => <span key={row.status} className="rounded-lg bg-slate-50 px-3 py-2 text-xs"><span className="text-slate-500">{row.status}</span> <strong className="ml-2">{number(row.count)}</strong></span>)}</div></article><article className={panel}><h2 className="mb-4 font-bold">Doanh thu theo kênh thanh toán</h2>{data.revenueByProvider.map((row) => <div className="flex justify-between border-b border-slate-100 py-3 text-sm" key={row.provider}><span>{row.provider === 'GOOGLE_PLAY' ? 'Google Play' : 'PayOS'}</span><strong>{money(row.revenue)}</strong></div>)}<p className="mt-3 text-xs text-slate-500">Kênh thanh toán không phải nguồn thu hút khách.</p></article></div>
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><h2 className="border-b border-slate-200 px-5 py-4 font-bold">Giao dịch gần đây trong kỳ</h2><PaymentTable rows={data.recentPayments} onSelect={onPayment} /></article>
    <p className="text-xs text-slate-500">Cập nhật {time(data.generatedAt)} · Kỳ hiện tại bao gồm hôm nay; kỳ trước là các ngày liền trước đó.</p>
  </div>}</section>;
}

export function AdminReviews() {
  const [period, setPeriod] = useState('30d');
  const [rating, setRating] = useState('');
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const refresh = () => setRevision((v) => v + 1);
  const report = useReport(() => adminApi.reviews({ period, rating, page }), `${period}:${rating}:${page}:${revision}`);
  const data = report.data;
  return <section><ReportHeader title="Đánh giá & góp ý" description="Lịch sử phản hồi trong Shelfy. Mỗi người dùng gửi một đánh giá; admin không sửa số sao hoặc nội dung." period={period} onPeriod={(v) => { setPeriod(v); setPage(0); }} refresh={refresh} /><ReportState {...report} retry={refresh} />{data && <>
    <article className={`${panel} mb-5`}><RatingSummary data={data} /></article>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Lịch sử đánh giá <span className="ml-2 text-sm font-normal text-slate-500">{number(data.matchedTotal)} kết quả</span></h2><select aria-label="Lọc số sao" value={rating} onChange={(e) => { setRating(e.target.value); setPage(0); }} className={input}><option value="">Tất cả số sao</option>{[5, 4, 3, 2, 1].map((v) => <option key={v} value={v}>{v} sao</option>)}</select></div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">{data.content.length ? <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Người đánh giá', 'Số sao', 'Góp ý', 'Thời gian'].map((v) => <th className="p-4" key={v}>{v}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{data.content.map((row) => <tr key={row.id}><td className="max-w-56 break-words p-4 align-top"><p className="font-bold">{row.fullName || 'Người dùng Shelfy'}</p><p className="mt-1 text-xs text-slate-500">{row.email}</p></td><td className="whitespace-nowrap p-4 align-top font-bold text-amber-700">{row.rating} ★</td><td className="max-w-lg whitespace-pre-wrap break-words p-4 align-top text-slate-600">{row.comment || 'Không có góp ý bằng chữ.'}</td><td className="whitespace-nowrap p-4 align-top text-xs text-slate-500">{time(row.createdAt)}</td></tr>)}</tbody></table></div> : <div className="px-5 py-16 text-center"><MaterialIcon name="rate_review" size={36} className="text-slate-300" /><p className="mt-3 font-bold">Chưa có đánh giá phù hợp</p><p className="mt-2 text-sm text-slate-500">Người dùng gửi tại Hồ sơ → Đánh giá Shelfy trong phiên bản app mới.</p></div>}
    {data.totalPages > 1 && <div className="flex items-center justify-between border-t p-4 text-sm"><button className={input} disabled={page === 0} onClick={() => setPage((v) => v - 1)}>Trước</button><span>Trang {page + 1} / {data.totalPages}</span><button className={input} disabled={page + 1 >= data.totalPages} onClick={() => setPage((v) => v + 1)}>Sau</button></div>}</div>
    {data.matchedTotal > 10020 && <p className="mt-4 text-xs text-amber-800">Lịch sử hiển thị tối đa 10.020 đánh giá gần nhất. Thu hẹp khoảng thời gian để xem các đánh giá cũ hơn.</p>}
    <p className="mt-4 text-xs text-slate-500">Thống kê sao áp dụng toàn bộ kỳ đã chọn. Bộ lọc sao chỉ áp dụng cho lịch sử bên dưới. Đánh giá được xóa khi tài khoản bị xóa.</p>
  </>}</section>;
}

export function AdminAnalytics() {
  const [period, setPeriod] = useState('30d');
  const [revision, setRevision] = useState(0);
  const refresh = () => setRevision((v) => v + 1);
  const report = useReport(() => adminApi.analytics(period), `${period}:${revision}`);
  const data = report.data;
  return <section><ReportHeader title="Đo lường nguồn truy cập" description="Google Analytics 4 giúp so sánh nguồn dẫn khách đến website Shelfy và số lần bấm tải ứng dụng." period={period} onPeriod={setPeriod} refresh={refresh} /><ReportState {...report} retry={refresh} />{data && <div className="space-y-5">
    {!data.configured ? <article className={`${panel} max-w-3xl`}><span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">Chưa kết nối GA4</span><h2 className="mt-4 text-xl font-extrabold">Bắt đầu thu thập dữ liệu thật</h2><p className="mt-2 text-sm leading-6 text-slate-600">{data.reason} Chưa có số liệu để kết luận Facebook, TikTok hay Google thu hút khách tốt hơn.</p><ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-600"><li>Tạo GA4 và luồng dữ liệu Web cho website Shelfy; chọn múi giờ Việt Nam.</li><li>Lấy Measurement ID dạng G-… để bật đo lường trên website.</li><li>Cấp quyền Viewer trong GA4 cho <code className="break-all">shelfy-worker@shelfy-acf38.iam.gserviceaccount.com</code>.</li><li>Bật Google Analytics Data API và cấu hình Property ID cho máy chủ để đọc báo cáo.</li></ol><a className="mt-5 inline-block text-sm font-bold text-secondary underline" href="https://analytics.google.com/" target="_blank" rel="noreferrer">Mở Google Analytics ↗</a><p className="mt-4 text-xs text-slate-500">Không cần gửi mật khẩu hoặc khóa bí mật. Dữ liệu bắt đầu ghi nhận sau khi kết nối và người truy cập đồng ý đo lường.</p></article> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon="group" label="Người truy cập web" value={number(data.users)} note="Người dùng do GA4 ghi nhận." /><Metric icon="travel_explore" label="Phiên truy cập" value={number(data.sessions)} note="Một người có thể có nhiều phiên." /><Metric icon="visibility" label="Lượt xem" value={number(data.views)} note="Lượt xem trang trên website." /><Metric icon="download" label="Bấm tải app" value={number(data.downloadClicks)} note="Số lần bấm liên kết tải; chưa phải lượt cài đặt." /></div>
      <article className={panel}><h2 className="font-bold">Nguồn nào mang khách đến?</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-96 text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-3">Nguồn / phương tiện</th><th>Phiên</th><th>Phiên tương tác</th></tr></thead><tbody className="divide-y">{data.sources.map((row) => <tr key={row.source}><td className="py-3 font-semibold">{row.source}</td><td>{number(row.sessions)}</td><td>{number(row.engagedSessions)}</td></tr>)}</tbody></table></div>{!data.sources.length && <p className="py-8 text-center text-sm text-slate-500">GA4 chưa có dữ liệu cho kỳ này.</p>}{data.sourcesLimited && <p className="text-xs text-amber-800">Hiển thị 100 nguồn có nhiều phiên nhất.</p>}</article><p className="text-xs text-slate-500">Dữ liệu GA4 có độ trễ; máy chủ lưu báo cáo 5 phút. Cập nhật {time(data.generatedAt)}.</p>
    </>}
    <article className={panel}><h2 className="font-bold">Gắn nguồn cho đường link quảng bá</h2><p className="mt-2 text-sm leading-6 text-slate-600">Dùng tham số UTM để phân biệt nền tảng. Ví dụ link đăng trên Facebook:</p><code className="mt-3 block overflow-x-auto rounded-xl bg-slate-50 p-4 text-xs">https://shelfy-web-d7d.pages.dev/?utm_source=facebook&amp;utm_medium=social&amp;utm_campaign=ra_mat</code><p className="mt-3 text-xs leading-5 text-slate-500">Đổi facebook thành tiktok cho link TikTok. Không đặt email hoặc thông tin cá nhân vào UTM. Báo cáo này đo website, chưa đo cài đặt, nguồn khách trong app hay doanh thu theo chiến dịch.</p></article>
  </div>}</section>;
}
