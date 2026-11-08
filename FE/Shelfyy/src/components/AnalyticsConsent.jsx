import { useEffect, useState } from 'react';
import { readConsent, saveConsent, startAnalytics } from '../analytics';

export function AnalyticsConsent() {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
  const [open, setOpen] = useState(() => !readConsent());
  useEffect(() => { startAnalytics(id); }, [id]);
  if (!/^G-[A-Z0-9]+$/.test(id || '')) return null;
  const choose = (value) => { if (saveConsent(value, id)) setOpen(false); };
  return open ? <aside aria-label="Lựa chọn đo lường website" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"><p className="font-bold">Cho phép đo lường lượt truy cập?</p><p className="mt-2 text-sm leading-6 text-slate-600">Shelfy dùng Google Analytics để biết nguồn khách và lượt bấm tải app. Chỉ bật khi bạn đồng ý. <a href="/privacy" className="underline">Quyền riêng tư</a></p><div className="mt-4 flex flex-wrap gap-3"><button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold" onClick={() => choose('declined')}>Từ chối</button><button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white" onClick={() => choose('accepted')}>Đồng ý đo lường</button></div></aside> : <button onClick={() => setOpen(true)} className="fixed bottom-3 left-3 z-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">Tùy chọn đo lường</button>;
}
