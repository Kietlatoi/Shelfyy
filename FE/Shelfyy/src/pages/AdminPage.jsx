import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { adminApi } from '../api/adminApi';
import { BrandLogo } from '../components/BrandLogo';
import { MaterialIcon } from '../components/MaterialIcon';
import { adminSignIn, adminSignOut, auth } from '../firebase/adminClient';

const tabs = [
  { id: 'overview', label: 'Tổng quan', icon: 'dashboard' },
  { id: 'users', label: 'Người dùng', icon: 'group' },
  { id: 'payments', label: 'Giao dịch', icon: 'payments' },
];
const periods = [
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: '90d', label: '90 ngày' },
  { value: 'all', label: 'Tất cả' },
];
const paymentStatuses = ['', 'CREATING', 'PENDING', 'PAID', 'CANCELLED', 'EXPIRED', 'FAILED', 'REVIEW', 'REFUNDED'];

function money(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function dateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
}

function Status({ value }) {
  const tones = {
    active: 'bg-emerald-50 text-emerald-700', locked: 'bg-rose-50 text-rose-700',
    PAID: 'bg-emerald-50 text-emerald-700', PENDING: 'bg-amber-50 text-amber-700',
    REVIEW: 'bg-violet-50 text-violet-700', FAILED: 'bg-rose-50 text-rose-700',
    CANCELLED: 'bg-slate-100 text-slate-700', EXPIRED: 'bg-slate-100 text-slate-700',
    REFUNDED: 'bg-sky-50 text-sky-700', CREATING: 'bg-blue-50 text-blue-700',
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tones[value] || 'bg-slate-100 text-slate-700'}`}>{value || '—'}</span>;
}

function Loading() {
  return <div className="flex min-h-64 items-center justify-center text-sm font-semibold text-slate-500">Đang tải dữ liệu…</div>;
}

function ErrorBox({ message }) {
  return message ? <div className="my-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{message}</div> : null;
}

function Login({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await adminSignIn(email, password);
      await adminApi.me();
      onSuccess();
    } catch (reason) {
      await adminSignOut().catch(() => {});
      setError(reason?.message?.includes('auth/invalid-credential') ? 'Email hoặc mật khẩu không đúng.' : reason.message);
    } finally {
      setBusy(false);
    }
  };
  return <main className="grid min-h-screen place-items-center bg-slate-50 px-4"><form className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5" onSubmit={submit}><BrandLogo tagline="Admin console" /><h1 className="mt-8 text-2xl font-extrabold text-slate-950">Đăng nhập quản trị</h1><p className="mt-2 text-sm text-slate-500">Chỉ tài khoản chủ sở hữu Shelfy được phép truy cập.</p><ErrorBox message={error} /><label className="mt-6 grid gap-2 text-sm font-bold text-slate-700">Email<input className="h-12 rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/10" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label><label className="mt-4 grid gap-2 text-sm font-bold text-slate-700">Mật khẩu<input className="h-12 rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/10" minLength="6" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label><button className="mt-6 h-12 w-full rounded-xl bg-slate-950 font-bold text-white disabled:opacity-60" disabled={busy} type="submit">{busy ? 'Đang kiểm tra…' : 'Đăng nhập'}</button><a className="mt-5 block text-center text-sm font-semibold text-slate-500 hover:text-secondary" href="/">Về landing page</a></form></main>;
}

function Metric({ icon, label, value, note }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-3 text-3xl font-extrabold text-slate-950">{value}</p></div><span className="grid h-11 w-11 place-items-center rounded-xl bg-rose-50 text-secondary"><MaterialIcon name={icon} /></span></div><p className="mt-4 text-sm text-slate-500">{note}</p></article>;
}

function PaymentTable({ rows, onSelect }) {
  if (!rows?.length) return <div className="p-10 text-center text-sm text-slate-500">Chưa có giao dịch.</div>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Mã đơn</th><th className="px-4 py-3">Người mua</th><th className="px-4 py-3">Gói</th><th className="px-4 py-3">Số tiền</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Thời gian</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((payment) => <tr className="cursor-pointer hover:bg-slate-50" key={payment.orderCode} onClick={() => onSelect?.(payment.orderCode)}><td className="px-4 py-3 font-bold text-slate-900">{payment.orderCode}</td><td className="px-4 py-3 text-slate-600">{payment.buyerEmail || 'Đã ẩn danh'}</td><td className="px-4 py-3 font-semibold">{payment.planId}</td><td className="px-4 py-3 font-bold">{money(payment.status === 'PAID' ? payment.amountPaid : payment.price)}</td><td className="px-4 py-3"><Status value={payment.status} /></td><td className="px-4 py-3 text-slate-500">{dateTime(payment.createdAt)}</td></tr>)}</tbody></table></div>;
}

function Overview({ onPayment }) {
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setData(null);
      setError('');
      adminApi.summary(period).then((value) => active && setData(value)).catch((reason) => active && setError(reason.message));
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [period]);
  const max = Math.max(1, ...(data?.series || []).flatMap((item) => [item.revenue, item.transactions * 69000]));
  return <section><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-extrabold text-slate-950">Tổng quan</h1><p className="mt-1 text-sm text-slate-500">Số liệu tài chính và hoạt động của Shelfy.</p></div><select className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold" onChange={(event) => setPeriod(event.target.value)} value={period}>{periods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div><ErrorBox message={error} />{!data ? <Loading /> : <><div className="grid gap-4 md:grid-cols-3"><Metric icon="paid" label="Doanh thu đã thanh toán" value={money(data.revenue)} note="Chỉ tính giao dịch PAID" /><Metric icon="group" label="Tổng người dùng" value={Number(data.users).toLocaleString('vi-VN')} note="Không tính tài khoản quản trị" /><Metric icon="receipt_long" label="Tổng giao dịch" value={Number(data.transactions).toLocaleString('vi-VN')} note={`${data.successfulTransactions} giao dịch thành công`} /></div><article className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-extrabold">Doanh thu và giao dịch</h2><div className="mt-6 flex h-64 items-end gap-2 overflow-x-auto border-b border-slate-200 pb-1">{data.series.length ? data.series.map((item) => <div className="flex min-w-10 flex-1 flex-col items-center justify-end gap-1" key={item.label} title={`${item.label}: ${money(item.revenue)}, ${item.transactions} giao dịch`}><div className="flex h-48 items-end gap-1"><span className="w-3 rounded-t bg-secondary" style={{ height: `${Math.max(3, item.revenue / max * 100)}%` }} /><span className="w-3 rounded-t bg-slate-800" style={{ height: `${Math.max(3, item.transactions * 69000 / max * 100)}%` }} /></div><span className="text-[10px] font-semibold text-slate-500">{item.label.slice(5)}</span></div>) : <p className="m-auto text-sm text-slate-500">Chưa có dữ liệu trong kỳ.</p>}</div><div className="mt-3 flex gap-5 text-xs font-semibold text-slate-600"><span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-secondary" />Doanh thu</span><span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-slate-800" />Giao dịch</span></div></article><article className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-extrabold">Giao dịch gần đây</h2></div><PaymentTable onSelect={onPayment} rows={data.recentPayments} /></article></>}</section>;
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3"><button className="rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-40" disabled={page <= 0} onClick={() => onChange(page - 1)}>Trước</button><span className="text-sm font-semibold text-slate-500">Trang {page + 1}/{totalPages}</span><button className="rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-40" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>Sau</button></div>;
}

function Users({ onSelect }) {
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    setData(null);
    setError('');
    adminApi.users({ page, size: 20, q: search }).then(setData).catch((reason) => setError(reason.message));
  }, [page, search]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  return <section><h1 className="text-2xl font-extrabold">Người dùng</h1><p className="mt-1 text-sm text-slate-500">Tìm kiếm, xem hồ sơ và kiểm soát quyền truy cập.</p><form className="my-6 flex gap-2" onSubmit={(event) => { event.preventDefault(); setPage(0); setSearch(draft.trim()); }}><input className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-4 outline-none focus:border-secondary" onChange={(event) => setDraft(event.target.value)} placeholder="Nhập chính xác email hoặc UID" value={draft} /><button className="rounded-xl bg-slate-950 px-5 text-sm font-bold text-white">Tìm kiếm</button>{search && <button className="rounded-xl border px-4 text-sm font-bold" onClick={() => { setDraft(''); setSearch(''); setPage(0); }} type="button">Xóa</button>}</form><ErrorBox message={error} /><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">{!data ? <Loading /> : <><div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Người dùng</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Gói</th><th className="px-4 py-3">Tủ đồ</th><th className="px-4 py-3">Đã thanh toán</th><th className="px-4 py-3">Ngày tạo</th><th /></tr></thead><tbody className="divide-y divide-slate-100">{data.content.map((user) => <tr key={user.uid}><td className="px-4 py-3"><p className="font-bold">{user.fullName || 'Người dùng Shelfy'}</p><p className="text-xs text-slate-500">{user.email}</p></td><td className="px-4 py-3"><Status value={user.status} /></td><td className="px-4 py-3 font-bold">{user.planId}</td><td className="px-4 py-3">{user.wardrobeCount}</td><td className="px-4 py-3 font-bold">{money(user.totalPaid)}</td><td className="px-4 py-3 text-slate-500">{dateTime(user.createdAt)}</td><td className="px-4 py-3 text-right"><button className="rounded-lg border px-3 py-2 text-xs font-bold hover:border-secondary" onClick={() => onSelect(user.uid)}>Chi tiết</button></td></tr>)}</tbody></table></div><Pagination onChange={setPage} page={data.page} totalPages={data.totalPages} /></>}</div></section>;
}

function Payments({ onSelect }) {
  const [page, setPage] = useState(0);
  const [period, setPeriod] = useState('30d');
  const [status, setStatus] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const load = useCallback(() => {
    setData(null);
    setError('');
    adminApi.payments({ page, size: 20, period, status }).then(setData).catch((reason) => setError(reason.message));
  }, [page, period, status]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  const exportCsv = async () => {
    setExporting(true);
    setError('');
    try { await adminApi.exportPayments({ period, status }); } catch (reason) { setError(reason.message); } finally { setExporting(false); }
  };
  return <section><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-extrabold">Giao dịch</h1><p className="mt-1 text-sm text-slate-500">Theo dõi và đối soát thanh toán PayOS và Google Play.</p></div><button className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-60" disabled={exporting} onClick={exportCsv}><MaterialIcon name="download" size={18} />{exporting ? 'Đang xuất…' : 'Xuất CSV'}</button></div><div className="my-6 flex flex-wrap gap-3"><select className="h-11 rounded-xl border border-slate-300 bg-white px-3 font-bold" onChange={(event) => { setPage(0); setPeriod(event.target.value); }} value={period}>{periods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><select className="h-11 rounded-xl border border-slate-300 bg-white px-3 font-bold" onChange={(event) => { setPage(0); setStatus(event.target.value); }} value={status}>{paymentStatuses.map((item) => <option key={item || 'all'} value={item}>{item || 'Tất cả trạng thái'}</option>)}</select></div><ErrorBox message={error} /><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">{!data ? <Loading /> : <><PaymentTable onSelect={onSelect} rows={data.content} /><Pagination onChange={setPage} page={data.page} totalPages={data.totalPages} /></>}</div></section>;
}

function Drawer({ title, onClose, children }) {
  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-xl font-extrabold">{title}</h2><button aria-label="Đóng" className="grid h-10 w-10 place-items-center rounded-xl border" onClick={onClose}><MaterialIcon name="close" /></button></div>{children}</aside></div>;
}

function UserDrawer({ uid, onClose, onUpdated }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { adminApi.user(uid).then(setUser).catch((reason) => setError(reason.message)); }, [uid]);
  const toggle = async () => {
    const next = user.status === 'locked' ? 'active' : 'locked';
    if (!window.confirm(`${next === 'locked' ? 'Khóa' : 'Mở khóa'} tài khoản ${user.email}?`)) return;
    setBusy(true);
    try {
      await adminApi.updateAccess(uid, next);
      setUser((current) => ({ ...current, status: next }));
      onUpdated();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  };
  const facts = user ? [
    ['Trạng thái', <Status value={user.status} />], ['Gói', user.planId],
    ['Hết hạn', dateTime(user.planExpiresAt)], ['Tủ đồ', user.wardrobeCount],
    ['Giao dịch', user.paymentCount], ['Đã thanh toán', money(user.totalPaid)],
    ['Ngày tạo', dateTime(user.createdAt)],
  ] : [];
  return <Drawer onClose={onClose} title="Chi tiết người dùng"><ErrorBox message={error} />{!user ? <Loading /> : <div className="mt-6 grid gap-4"><div className="rounded-2xl bg-slate-50 p-5"><p className="text-lg font-extrabold">{user.fullName}</p><p className="mt-1 text-sm text-slate-500">{user.email}</p><p className="mt-1 break-all text-xs text-slate-400">{user.uid}</p></div><dl className="grid grid-cols-2 gap-3">{facts.map(([label, value]) => <div className="rounded-xl border p-4" key={label}><dt className="text-xs font-bold uppercase text-slate-500">{label}</dt><dd className="mt-2 font-bold">{value}</dd></div>)}</dl><button className={`h-12 rounded-xl font-bold text-white disabled:opacity-60 ${user.status === 'locked' ? 'bg-emerald-600' : 'bg-rose-600'}`} disabled={busy} onClick={toggle}>{user.status === 'locked' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}</button></div>}</Drawer>;
}

function PaymentDrawer({ orderCode, onClose, onUpdated }) {
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => adminApi.payment(orderCode).then(setPayment).catch((reason) => setError(reason.message)), [orderCode]);
  useEffect(load, [load]);
  const reconcile = async () => {
    setBusy(true);
    setError('');
    try {
      setPayment(await adminApi.reconcile(orderCode));
      onUpdated();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  };
  const facts = payment ? [
    ['Email', payment.buyerEmail || 'Đã ẩn danh'], ['UID', payment.uid || '—'],
    ['Gói', payment.planId], ['Giá niêm yết', money(payment.price)],
    ['Kênh thanh toán', payment.provider || 'PAYOS'], ['Giao dịch thử nghiệm', payment.isTest ? 'Có' : 'Không'],
    ['Cần kiểm tra quyền lợi', payment.entitlementReviewRequired ? 'Có' : 'Không'],
    ['PayOS paymentLinkId', payment.paymentLinkId || '—'], ['Mã tham chiếu', payment.providerReference || '—'],
    ['Ngày tạo', dateTime(payment.createdAt)], ['Ngày thanh toán', dateTime(payment.paidAt)],
    ['Cập nhật', dateTime(payment.updatedAt)], ['Mã lỗi', payment.failureCode || '—'],
  ] : [];
  return <Drawer onClose={onClose} title={`Giao dịch ${orderCode}`}><ErrorBox message={error} />{!payment ? <Loading /> : <div className="mt-6 grid gap-4"><div className="flex items-center justify-between rounded-2xl bg-slate-50 p-5"><div><p className="text-sm text-slate-500">Số tiền</p><p className="mt-1 text-2xl font-extrabold">{money(payment.status === 'PAID' ? payment.amountPaid : payment.price)}</p></div><Status value={payment.status} /></div><dl className="grid gap-3">{facts.map(([label, value]) => <div className="rounded-xl border p-4" key={label}><dt className="text-xs font-bold uppercase text-slate-500">{label}</dt><dd className="mt-1 break-all font-semibold">{value}</dd></div>)}</dl><button className="h-12 rounded-xl bg-slate-950 font-bold text-white disabled:opacity-60" disabled={busy} onClick={reconcile}>{busy ? 'Đang đối soát…' : 'Đối soát giao dịch'}</button></div>}</Drawer>;
}

export function AdminPage() {
  const [authReady, setAuthReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState('overview');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setAuthorized(false);
      setAuthReady(true);
      return;
    }
    try {
      await adminApi.me();
      setAuthorized(true);
    } catch {
      await adminSignOut().catch(() => {});
      setAuthorized(false);
    } finally {
      setAuthReady(true);
    }
  }), []);
  const content = useMemo(() => {
    if (tab === 'users') return <Users key={`users-${revision}`} onSelect={setSelectedUser} />;
    if (tab === 'payments') return <Payments key={`payments-${revision}`} onSelect={setSelectedPayment} />;
    return <Overview key={`overview-${revision}`} onPayment={setSelectedPayment} />;
  }, [tab, revision]);
  if (!authReady) return <main className="grid min-h-screen place-items-center bg-slate-50 font-semibold text-slate-500">Đang kiểm tra phiên quản trị…</main>;
  if (!authorized) return <Login onSuccess={() => setAuthorized(true)} />;
  return <div className="min-h-screen bg-slate-50 text-slate-900"><aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white p-5 md:flex md:flex-col"><BrandLogo tagline="Admin console" /><nav className="mt-9 grid gap-2">{tabs.map((item) => <button className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold ${tab === item.id ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`} key={item.id} onClick={() => setTab(item.id)}><MaterialIcon name={item.icon} size={20} />{item.label}</button>)}</nav><button className="mt-auto flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100" onClick={() => adminSignOut()}><MaterialIcon name="logout" size={20} />Đăng xuất</button></aside><header className="sticky top-0 z-20 flex items-center gap-2 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">{tabs.map((item) => <button aria-label={item.label} className={`grid h-10 w-10 place-items-center rounded-xl ${tab === item.id ? 'bg-slate-950 text-white' : 'text-slate-500'}`} key={item.id} onClick={() => setTab(item.id)}><MaterialIcon name={item.icon} size={20} /></button>)}<button aria-label="Đăng xuất" className="ml-auto grid h-10 w-10 place-items-center rounded-xl text-slate-500" onClick={() => adminSignOut()}><MaterialIcon name="logout" size={20} /></button></header><main className="p-4 md:ml-64 md:p-8"><div className="mx-auto max-w-7xl">{content}</div></main>{selectedUser && <UserDrawer onClose={() => setSelectedUser(null)} onUpdated={() => setRevision((value) => value + 1)} uid={selectedUser} />}{selectedPayment && <PaymentDrawer onClose={() => setSelectedPayment(null)} onUpdated={() => setRevision((value) => value + 1)} orderCode={selectedPayment} />}</div>;
}

export default AdminPage;
