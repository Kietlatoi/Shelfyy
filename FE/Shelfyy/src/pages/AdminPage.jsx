import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi } from '../api/adminApi';
import { BrandLogo, LogoMark } from '../components/BrandLogo';
import { MaterialIcon } from '../components/MaterialIcon';
import { TopNav } from '../components/TopNav';
import { topNavData } from '../const/homeData';
import { useTopNavUser } from '../hooks/useTopNavUser';

const tabs = [
  { key: 'overview', label: 'Tổng quan', icon: 'dashboard' },
  { key: 'analytics', label: 'Analytics', icon: 'monitoring' },
  { key: 'users', label: 'Người dùng', icon: 'group' },
  { key: 'payments', label: 'Thanh toán', icon: 'payments' },
  { key: 'subscriptions', label: 'Gói dùng', icon: 'workspace_premium' },
  { key: 'audit', label: 'Audit log', icon: 'fact_check' },
];

const statusTones = {
  ACTIVE: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  BANNED: 'border-rose-100 bg-rose-50 text-rose-700',
  LOCKED: 'border-amber-100 bg-amber-50 text-amber-700',
  SUCCESS: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  PENDING: 'border-amber-100 bg-amber-50 text-amber-700',
  FAILED: 'border-rose-100 bg-rose-50 text-rose-700',
  CANCELLED: 'border-slate-200 bg-slate-50 text-slate-700',
  REFUNDED: 'border-sky-100 bg-sky-50 text-sky-700',
  EXPIRED: 'border-slate-200 bg-slate-50 text-slate-700',
  FREE: 'border-slate-200 bg-slate-50 text-slate-700',
  PRO: 'border-sky-100 bg-sky-50 text-sky-700',
  PREMIUM: 'border-secondary/20 bg-secondary-fixed text-secondary',
};

const userStatuses = ['', 'ACTIVE', 'LOCKED', 'BANNED'];
const userPlans = ['', 'FREE', 'PRO', 'PREMIUM'];
const paymentStatuses = ['', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED'];
const subscriptionStatuses = ['', 'ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED'];

function money(value, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Number(value || 0));
}

function compactMoney(value) {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1000000000) return `${(amount / 1000000000).toFixed(1)} tỷ`;
  if (Math.abs(amount) >= 1000000) return `${(amount / 1000000).toFixed(1)}tr`;
  if (Math.abs(amount) >= 1000) return `${Math.round(amount / 1000)}k`;
  return String(amount);
}

function numberText(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function percentText(value) {
  return `${Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
}

function shortDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function plainDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function chartDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

const chartPalette = ['#ba0035', '#047857', '#2563eb', '#f59e0b', '#7c3aed', '#475467'];

function chartColor(index) {
  return chartPalette[index % chartPalette.length];
}

function boundedPercent(value) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

function getSeriesValue(item) {
  return Number(item?.value || 0);
}

function pageTotal(page) {
  return Number(page?.totalElements || 0).toLocaleString('vi-VN');
}

function StatusBadge({ value }) {
  const text = value || '-';
  const tone = statusTones[text] || 'border-border-subtle bg-surface-container-low text-on-surface-variant';
  return (
    <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-extrabold ${tone}`}>
      {text}
    </span>
  );
}

function SelectFilter({ label, value, options, onChange }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</span>
      <select
        className="h-10 rounded-lg border border-border-subtle bg-white px-3 text-sm font-semibold text-primary outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option || 'ALL'} value={option}>
            {option || 'Tất cả'}
          </option>
        ))}
      </select>
    </label>
  );
}

function SearchBox({ placeholder, value, onChange, onSubmit, onClear }) {
  return (
    <form className="grid gap-1.5" onSubmit={onSubmit}>
      <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Tìm kiếm</span>
      <div className="flex h-10 items-center rounded-lg border border-border-subtle bg-white px-3 focus-within:border-secondary focus-within:ring-4 focus-within:ring-secondary/10">
        <MaterialIcon name="search" size={18} className="text-on-surface-variant" />
        <input
          className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-on-surface-variant"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type="search"
          value={value}
        />
        {value && (
          <button
            aria-label="Xóa tìm kiếm"
            className="flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
            onClick={onClear}
            type="button"
          >
            <MaterialIcon name="close" size={16} />
          </button>
        )}
      </div>
    </form>
  );
}

function Pagination({ page, onPageChange }) {
  const current = Number(page?.page || 0);
  const totalPages = Number(page?.totalPages || 0);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-white p-3">
      <button
        className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-sm font-bold text-primary transition hover:border-secondary disabled:cursor-not-allowed disabled:opacity-50"
        disabled={page?.first}
        onClick={() => onPageChange(Math.max(0, current - 1))}
        type="button"
      >
        <MaterialIcon name="chevron_left" size={18} />
        Trước
      </button>
      <span className="text-sm font-bold text-on-surface-variant">
        Trang {current + 1} / {totalPages}
      </span>
      <button
        className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-sm font-bold text-primary transition hover:border-secondary disabled:cursor-not-allowed disabled:opacity-50"
        disabled={page?.last}
        onClick={() => onPageChange(current + 1)}
        type="button"
      >
        Sau
        <MaterialIcon name="chevron_right" size={18} />
      </button>
    </div>
  );
}

function AdminSidebar({ activeTab, onChange }) {
  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-border-subtle bg-white px-4 py-7">
      <a className="mb-8 flex items-center gap-3 px-2" href="#/home">
        <BrandLogo
          markClassName="h-10 w-10"
          tagline="Admin console"
          textClassName="max-w-[150px]"
        />
      </a>

      <nav className="grid gap-2" aria-label="Admin navigation">
        {tabs.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <button
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-bold transition ${
                active
                  ? 'bg-surface-container-low text-secondary shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
              }`}
              key={tab.key}
              onClick={() => onChange(tab.key)}
              type="button"
            >
              <MaterialIcon name={tab.icon} filled={active} size={20} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-lg border border-border-subtle bg-surface-container-low p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Quyền truy cập</p>
        <p className="mt-2 text-sm font-extrabold text-primary">Chỉ role ADMIN</p>
        <p className="mt-1 text-xs leading-5 text-on-surface-variant">Các thao tác ghi đều được lưu vào audit log.</p>
      </div>
    </aside>
  );
}

function MetricCard({ icon, label, value, subValue, tone = 'text-secondary', accent = 'bg-secondary' }) {
  return (
    <article className="relative min-w-0 overflow-hidden rounded-lg border border-border-subtle bg-white p-5 shadow-sm shadow-primary/5">
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-widest text-on-surface-variant">{label}</p>
          <p className="mt-3 truncate text-3xl font-extrabold text-primary">{value}</p>
        </div>
        <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-surface-container-low ${tone}`}>
          <MaterialIcon name={icon} size={23} />
        </span>
      </div>
      {subValue && <p className="mt-4 text-sm font-semibold text-on-surface-variant">{subValue}</p>}
    </article>
  );
}

function ChartBars({ data, label, caption, formatter = (value) => value, compactFormatter = (value) => value, tone = 'secondary' }) {
  const rows = Array.isArray(data)
    ? data.map((item) => ({
      date: item.date,
      label: chartDate(item.date),
      rawLabel: plainDate(item.date),
      value: Number(item.value || 0),
    }))
    : [];
  const max = Math.max(1, ...rows.map((item) => item.value));
  const total = rows.reduce((sum, item) => sum + item.value, 0);
  const plot = {
    bottom: 182,
    height: 126,
    left: 46,
    right: 616,
    top: 32,
  };
  const slot = rows.length ? (plot.right - plot.left) / rows.length : 0;
  const barWidth = Math.max(10, Math.min(24, slot * 0.54));
  const fill = tone === 'emerald' ? '#047857' : '#ba0035';
  const softFill = tone === 'emerald' ? '#d1fae5' : '#ffdada';

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-border-subtle bg-white p-5 shadow-sm shadow-primary/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-extrabold text-primary">{label}</h3>
          {caption && <p className="mt-1 text-sm font-semibold text-on-surface-variant">{caption}</p>}
        </div>
        <div className="rounded-lg bg-surface-container-low px-3 py-2 text-right">
          <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Tổng</p>
          <p className="text-sm font-extrabold text-primary">{formatter(total)}</p>
        </div>
      </div>

      {rows.length ? (
        <div className="mt-5 overflow-hidden rounded-lg bg-surface-container-low/60 px-3 py-4">
          <svg aria-label={label} className="h-[260px] w-full" role="img" viewBox="0 0 640 220">
            {[0, 0.5, 1].map((ratio) => {
              const y = plot.bottom - ratio * plot.height;
              return (
                <g key={ratio}>
                  <line stroke="#dce2e8" strokeDasharray={ratio === 0 ? '0' : '4 6'} x1={plot.left} x2={plot.right} y1={y} y2={y} />
                  <text fill="#667085" fontSize="10" fontWeight="700" textAnchor="end" x={plot.left - 8} y={y + 4}>
                    {compactFormatter(Math.round(max * ratio))}
                  </text>
                </g>
              );
            })}
            {rows.map((item, index) => {
              const height = Math.max(4, (item.value / max) * plot.height);
              const x = plot.left + index * slot + (slot - barWidth) / 2;
              const y = plot.bottom - height;
              return (
                <g key={`${item.date}-${index}`}>
                  <rect fill={softFill} height={plot.height} opacity="0.5" rx="5" width={barWidth} x={x} y={plot.top} />
                  <rect fill={fill} height={height} rx="5" width={barWidth} x={x} y={y}>
                    <title>{`${item.rawLabel}: ${formatter(item.value)}`}</title>
                  </rect>
                  {(index % 2 === 0 || rows.length <= 8) && (
                    <text fill="#475467" fontSize="10" fontWeight="700" textAnchor="middle" x={x + barWidth / 2} y={204}>
                      {item.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        <div className="mt-5 flex h-[260px] w-full items-center justify-center rounded-lg bg-surface-container-low text-sm font-semibold text-on-surface-variant">
            Chưa có dữ liệu biểu đồ
        </div>
      )}
    </section>
  );
}

function DualLineChart({
  caption,
  primary,
  primaryFormatter = numberText,
  primaryLabel,
  secondary,
  secondaryFormatter = numberText,
  secondaryLabel,
  title,
}) {
  const primaryRows = Array.isArray(primary) ? primary : [];
  const secondaryRows = Array.isArray(secondary) ? secondary : [];
  const rows = primaryRows.length
    ? primaryRows.map((item, index) => ({
      date: item.date,
      label: chartDate(item.date),
      primary: getSeriesValue(item),
      rawLabel: plainDate(item.date),
      secondary: getSeriesValue(secondaryRows[index]),
    }))
    : secondaryRows.map((item, index) => ({
      date: item.date,
      label: chartDate(item.date),
      primary: getSeriesValue(primaryRows[index]),
      rawLabel: plainDate(item.date),
      secondary: getSeriesValue(item),
    }));
  const max = Math.max(1, ...rows.flatMap((item) => [item.primary, item.secondary]));
  const primaryTotal = rows.reduce((sum, item) => sum + item.primary, 0);
  const secondaryTotal = rows.reduce((sum, item) => sum + item.secondary, 0);
  const plot = {
    bottom: 184,
    height: 132,
    left: 48,
    right: 612,
    top: 34,
  };
  const step = rows.length > 1 ? (plot.right - plot.left) / (rows.length - 1) : 0;
  const xFor = (index) => plot.left + index * step;
  const yFor = (value) => plot.bottom - (Number(value || 0) / max) * plot.height;
  const primaryPoints = rows.map((item, index) => `${xFor(index)},${yFor(item.primary)}`).join(' ');
  const secondaryPoints = rows.map((item, index) => `${xFor(index)},${yFor(item.secondary)}`).join(' ');

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-border-subtle bg-white p-5 shadow-sm shadow-primary/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-extrabold text-primary">{title}</h3>
          {caption && <p className="mt-1 text-sm font-semibold text-on-surface-variant">{caption}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-rose-50 px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-secondary">{primaryLabel}</p>
            <p className="text-sm font-extrabold text-primary">{primaryFormatter(primaryTotal)}</p>
          </div>
          <div className="rounded-lg bg-sky-50 px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-sky-700">{secondaryLabel}</p>
            <p className="text-sm font-extrabold text-primary">{secondaryFormatter(secondaryTotal)}</p>
          </div>
        </div>
      </div>

      {rows.length ? (
        <div className="mt-5 overflow-hidden rounded-lg bg-surface-container-low/60 px-3 py-4">
          <svg aria-label={title} className="h-[260px] w-full" role="img" viewBox="0 0 640 220">
            {[0, 0.5, 1].map((ratio) => {
              const y = plot.bottom - ratio * plot.height;
              return (
                <g key={ratio}>
                  <line stroke="#dce2e8" strokeDasharray={ratio === 0 ? '0' : '4 6'} x1={plot.left} x2={plot.right} y1={y} y2={y} />
                  <text fill="#667085" fontSize="10" fontWeight="700" textAnchor="end" x={plot.left - 8} y={y + 4}>
                    {numberText(Math.round(max * ratio))}
                  </text>
                </g>
              );
            })}
            <polyline fill="none" points={primaryPoints} stroke="#ba0035" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
            <polyline fill="none" points={secondaryPoints} stroke="#2563eb" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
            {rows.map((item, index) => (
              <g key={`${item.date}-${index}`}>
                <circle cx={xFor(index)} cy={yFor(item.primary)} fill="#fff" r="4" stroke="#ba0035" strokeWidth="3">
                  <title>{`${item.rawLabel} · ${primaryLabel}: ${primaryFormatter(item.primary)}`}</title>
                </circle>
                <circle cx={xFor(index)} cy={yFor(item.secondary)} fill="#fff" r="4" stroke="#2563eb" strokeWidth="3">
                  <title>{`${item.rawLabel} · ${secondaryLabel}: ${secondaryFormatter(item.secondary)}`}</title>
                </circle>
                {(index % 3 === 0 || rows.length <= 8) && (
                  <text fill="#475467" fontSize="10" fontWeight="700" textAnchor="middle" x={xFor(index)} y={205}>
                    {item.label}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      ) : (
        <div className="mt-5 flex h-[260px] items-center justify-center rounded-lg bg-surface-container-low text-sm font-semibold text-on-surface-variant">
          Chưa có dữ liệu biểu đồ
        </div>
      )}
    </section>
  );
}

function DonutChart({ eyebrow, items, labelKey, title, valueFormatter = numberText, valueKey }) {
  const rows = Array.isArray(items)
    ? items
      .map((item) => ({
        label: item[labelKey] || '-',
        value: Number(item[valueKey] || 0),
      }))
      .filter((item) => item.value > 0)
    : [];
  const total = rows.reduce((sum, item) => sum + item.value, 0);
  const gradient = rows.reduce((state, item, index) => {
    const next = state.cursor + (item.value / Math.max(1, total)) * 100;
    return {
      cursor: next,
      segments: [...state.segments, `${chartColor(index)} ${state.cursor}% ${next}%`],
    };
  }, { cursor: 0, segments: [] }).segments.join(', ');

  return (
    <section className="min-w-0 rounded-lg border border-border-subtle bg-white p-5 shadow-sm shadow-primary/5">
      {eyebrow && <p className="text-xs font-bold uppercase tracking-widest text-secondary">{eyebrow}</p>}
      <h3 className="mt-1 text-lg font-extrabold text-primary">{title}</h3>
      {rows.length ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[160px_1fr] lg:items-center">
          <div
            aria-label={`${title}: ${valueFormatter(total)}`}
            className="mx-auto flex h-40 w-40 items-center justify-center rounded-full p-4"
            role="img"
            style={{ background: `conic-gradient(${gradient})` }}
          >
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white text-center shadow-inner shadow-primary/5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Tổng</span>
              <strong className="mt-1 text-xl font-extrabold text-primary">{valueFormatter(total)}</strong>
            </div>
          </div>
          <div className="grid gap-3">
            {rows.map((item, index) => {
              const share = (item.value / Math.max(1, total)) * 100;
              return (
                <div className="flex items-center justify-between gap-3" key={item.label}>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-3 w-3 flex-none rounded-sm" style={{ backgroundColor: chartColor(index) }} />
                    <span className="truncate text-sm font-bold text-primary">{item.label}</span>
                  </div>
                  <div className="flex-none text-right">
                    <p className="text-sm font-extrabold text-primary">{valueFormatter(item.value)}</p>
                    <p className="text-xs font-bold text-on-surface-variant">{percentText(share)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mt-5 rounded-lg bg-surface-container-low p-4 text-sm font-semibold text-on-surface-variant">Chưa có dữ liệu.</p>
      )}
    </section>
  );
}

function StackedBarChart({ eyebrow, items, title, valueFormatter = numberText }) {
  const rows = Array.isArray(items)
    ? items
      .map((item) => ({ ...item, value: Number(item.value || 0) }))
      .filter((item) => item.value > 0)
    : [];
  const total = rows.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="min-w-0 rounded-lg border border-border-subtle bg-white p-5 shadow-sm shadow-primary/5">
      {eyebrow && <p className="text-xs font-bold uppercase tracking-widest text-secondary">{eyebrow}</p>}
      <div className="mt-1 flex items-start justify-between gap-4">
        <h3 className="text-lg font-extrabold text-primary">{title}</h3>
        <strong className="flex-none rounded-lg bg-surface-container-low px-3 py-2 text-sm font-extrabold text-primary">{valueFormatter(total)}</strong>
      </div>
      {rows.length ? (
        <>
          <div className="mt-5 flex h-5 overflow-hidden rounded-full bg-surface-container-low">
            {rows.map((item, index) => (
              <div
                aria-label={`${item.label}: ${valueFormatter(item.value)}`}
                className="h-full"
                key={item.label}
                role="img"
                style={{
                  backgroundColor: item.color || chartColor(index),
                  width: `${Math.max(3, (item.value / Math.max(1, total)) * 100)}%`,
                }}
              />
            ))}
          </div>
          <div className="mt-5 grid gap-3">
            {rows.map((item, index) => {
              const share = (item.value / Math.max(1, total)) * 100;
              return (
                <div className="flex items-center justify-between gap-3" key={item.label}>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-3 w-3 flex-none rounded-sm" style={{ backgroundColor: item.color || chartColor(index) }} />
                    <span className="truncate text-sm font-bold text-primary">{item.label}</span>
                  </div>
                  <div className="flex-none text-right">
                    <p className="text-sm font-extrabold text-primary">{valueFormatter(item.value)}</p>
                    <p className="text-xs font-bold text-on-surface-variant">{percentText(share)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="mt-5 rounded-lg bg-surface-container-low p-4 text-sm font-semibold text-on-surface-variant">Chưa có dữ liệu.</p>
      )}
    </section>
  );
}

function GaugeCard({ detail, label, value }) {
  const percent = boundedPercent(value);
  return (
    <article className="min-w-0 rounded-lg border border-border-subtle bg-white p-5 shadow-sm shadow-primary/5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-primary">{label}</p>
          {detail && <p className="mt-1 text-xs font-semibold text-on-surface-variant">{detail}</p>}
        </div>
        <strong className="flex-none text-lg font-extrabold text-secondary">{percentText(percent)}</strong>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-container-low">
        <div className="h-full rounded-full bg-secondary" style={{ width: `${percent}%` }} />
      </div>
    </article>
  );
}

function SignalRow({ label, value, tone = 'text-primary' }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-container-low px-4 py-3">
      <span className="text-sm font-semibold text-on-surface-variant">{label}</span>
      <strong className={`text-base font-extrabold ${tone}`}>{value}</strong>
    </div>
  );
}

function BreakdownList({ title, eyebrow, items, labelKey, valueKey, valueFormatter = numberText, subRenderer }) {
  const rows = Array.isArray(items) ? items : [];
  const max = Math.max(1, ...rows.map((item) => Number(item[valueKey] || 0)));
  return (
    <section className="min-w-0 rounded-lg border border-border-subtle bg-white p-5 shadow-sm shadow-primary/5">
      {eyebrow && <p className="text-xs font-bold uppercase tracking-widest text-secondary">{eyebrow}</p>}
      <h3 className="mt-1 text-lg font-extrabold text-primary">{title}</h3>
      <div className="mt-5 grid gap-4">
        {rows.length ? rows.map((item) => {
          const value = Number(item[valueKey] || 0);
          const width = Math.max(4, Math.round((value / max) * 100));
          const label = item[labelKey] || '-';
          return (
            <div className="grid gap-2" key={label}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-primary">{label}</p>
                  {subRenderer && <p className="mt-1 text-xs font-semibold text-on-surface-variant">{subRenderer(item)}</p>}
                </div>
                <strong className="flex-none text-sm font-extrabold text-primary">{valueFormatter(value)}</strong>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-container-low">
                <div className="h-full rounded-full bg-secondary" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        }) : (
          <p className="rounded-lg bg-surface-container-low p-4 text-sm font-semibold text-on-surface-variant">Chưa có dữ liệu.</p>
        )}
      </div>
    </section>
  );
}

function CohortRetention({ cohorts }) {
  const rows = Array.isArray(cohorts) ? cohorts.slice(-10).reverse() : [];
  return (
    <section className="min-w-0 rounded-lg border border-border-subtle bg-white p-5 shadow-sm shadow-primary/5">
      <p className="text-xs font-bold uppercase tracking-widest text-secondary">Retention proxy</p>
      <h3 className="mt-1 text-lg font-extrabold text-primary">Cohort D7 gần đây</h3>
      <div className="mt-5 overflow-hidden rounded-lg border border-border-subtle">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-surface-container-low text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">Cohort</th>
              <th className="px-4 py-3">User mới</th>
              <th className="px-4 py-3">Active D1-D7</th>
              <th className="px-4 py-3">Retention</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle bg-white">
            {rows.length ? rows.map((row) => (
              <tr key={row.date}>
                <td className="px-4 py-3 font-bold text-primary">{chartDate(row.date)}</td>
                <td className="px-4 py-3 font-semibold text-on-surface-variant">{numberText(row.newUsers)}</td>
                <td className="px-4 py-3 font-semibold text-on-surface-variant">{numberText(row.activeAfter7d)}</td>
                <td className="px-4 py-3 font-extrabold text-primary">{percentText(row.retention7d)}</td>
              </tr>
            )) : (
              <tr>
                <td className="px-4 py-6 text-center font-semibold text-on-surface-variant" colSpan={4}>Chưa có cohort.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SectionShell({ title, description, action, children }) {
  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-secondary">Admin</p>
          <h1 className="mt-2 text-3xl font-extrabold text-primary">{title}</h1>
          {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function LoadingBlock() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <div className="h-32 animate-pulse rounded-lg bg-white" />
      <div className="h-96 animate-pulse rounded-lg bg-white" />
    </div>
  );
}

function EmptyBlock({ title }) {
  return (
    <div className="rounded-lg border border-dashed border-border-subtle bg-white p-10 text-center">
      <MaterialIcon name="inbox" size={34} className="mx-auto text-on-surface-variant" />
      <p className="mt-3 text-sm font-bold text-on-surface-variant">{title}</p>
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 sm:flex-row sm:items-center sm:justify-between" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-extrabold text-rose-700" onClick={onRetry} type="button">
          <MaterialIcon name="refresh" size={16} />
          Thử lại
        </button>
      )}
    </div>
  );
}

function OverviewTab({ overview, loading }) {
  if (loading) return <LoadingBlock />;
  if (!overview) return <EmptyBlock title="Chưa có dữ liệu tổng quan" />;

  return (
    <SectionShell
      title="Tổng quan hệ thống"
      description="Theo dõi sức khỏe sản phẩm, tăng trưởng người dùng, doanh thu và mức sử dụng các tính năng Nodejs."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon="group"
          label="Người dùng"
          value={numberText(overview.users.total)}
          subValue={`${overview.users.active} active · ${overview.users.paid} trả phí`}
        />
        <MetricCard
          accent="bg-sky-600"
          icon="checkroom"
          label="Món đồ"
          value={numberText(overview.wardrobe.totalItems)}
          subValue={`${overview.wardrobe.newItems7d} món mới trong 7 ngày`}
          tone="text-sky-700"
        />
        <MetricCard
          accent="bg-emerald-600"
          icon="payments"
          label="Doanh thu"
          value={money(overview.payments.revenue)}
          subValue={`${overview.payments.success} giao dịch thành công`}
          tone="text-emerald-700"
        />
        <MetricCard
          accent="bg-amber-500"
          icon="accessibility_new"
          label="AI try-on"
          value={numberText(overview.engagement.completedTrials)}
          subValue={`${overview.engagement.savedTrials} kết quả đã lưu`}
          tone="text-amber-700"
        />
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <ChartBars
          caption="14 ngày gần nhất"
          compactFormatter={(value) => numberText(value)}
          data={overview.charts.usersByDay}
          label="Người dùng mới theo ngày"
        />
        <ChartBars
          caption="Chỉ tính giao dịch thành công"
          compactFormatter={(value) => compactMoney(value)}
          data={overview.charts.revenueByDay}
          formatter={(value) => money(value)}
          label="Doanh thu theo ngày"
          tone="emerald"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr_0.85fr]">
        <section className="min-w-0 rounded-lg border border-border-subtle bg-white p-5 shadow-sm shadow-primary/5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-secondary">Rủi ro vận hành</p>
              <h3 className="mt-1 text-lg font-extrabold text-primary">Tài khoản cần chú ý</h3>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-secondary">
              <MaterialIcon name="priority_high" size={22} />
            </span>
          </div>
          <div className="mt-4 grid gap-3 text-sm">
            <SignalRow label="Locked" value={overview.users.locked} tone="text-amber-700" />
            <SignalRow label="Banned" value={overview.users.banned} tone="text-rose-700" />
            <SignalRow label="Payment pending" value={overview.payments.pending} tone="text-amber-700" />
          </div>
        </section>

        <section className="min-w-0 rounded-lg border border-border-subtle bg-white p-5 shadow-sm shadow-primary/5">
          <p className="text-xs font-bold uppercase tracking-widest text-secondary">Inventory</p>
          <h3 className="mt-1 text-lg font-extrabold text-primary">Tủ đồ theo nhóm</h3>
          <div className="mt-4 grid gap-3 text-sm">
            <SignalRow label="Áo" value={overview.wardrobe.categories.tops} />
            <SignalRow label="Quần" value={overview.wardrobe.categories.bottoms} />
            <SignalRow label="Phụ kiện" value={overview.wardrobe.categories.accessories} />
          </div>
        </section>

        <section className="min-w-0 rounded-lg border border-border-subtle bg-white p-5 shadow-sm shadow-primary/5">
          <p className="text-xs font-bold uppercase tracking-widest text-secondary">Engagement</p>
          <h3 className="mt-1 text-lg font-extrabold text-primary">Tích hợp</h3>
          <div className="mt-4 grid gap-3 text-sm">
            <SignalRow label="Calendar connected" value={overview.engagement.connectedCalendars} />
            <SignalRow label="Outfit confirmed" value={overview.engagement.dailyOutfits} />
            <SignalRow label="Trial failed" value={overview.engagement.failedTrials} tone="text-rose-700" />
          </div>
        </section>
      </div>
    </SectionShell>
  );
}

function AnalyticsTab({ analytics, days, loading, onDaysChange, onRefresh }) {
  if (loading) return <LoadingBlock />;
  if (!analytics) return <EmptyBlock title="Chưa có dữ liệu analytics" />;

  const paymentStatusMix = [
    { color: '#047857', label: 'Thành công', value: analytics.revenue.successfulPayments },
    { color: '#f59e0b', label: 'Đang chờ', value: analytics.revenue.pendingPayments },
    { color: '#ba0035', label: 'Thất bại', value: analytics.revenue.failedPayments },
    { color: '#475467', label: 'Hoàn / đảo', value: analytics.revenue.reversedPayments },
  ];
  const tryOnStatusMix = [
    { color: '#047857', label: 'Completed', value: analytics.ai.completedTrials },
    { color: '#ba0035', label: 'Failed', value: analytics.ai.failedTrials },
    { color: '#f59e0b', label: 'Processing', value: analytics.ai.processingTrials },
  ];
  const suggestionStatusMix = [
    { color: '#047857', label: 'Confirmed', value: analytics.ai.confirmedSuggestions },
    { color: '#2563eb', label: 'Generated', value: analytics.ai.generatedSuggestions },
    { color: '#ba0035', label: 'Failed', value: analytics.ai.failedSuggestions },
  ];

  return (
    <SectionShell
      action={(
        <div className="flex flex-wrap items-center gap-3">
          <label className="grid gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Khoảng thời gian</span>
            <select
              className="h-10 rounded-lg border border-border-subtle bg-white px-3 text-sm font-bold text-primary outline-none"
              onChange={(event) => onDaysChange(Number(event.target.value))}
              value={days}
            >
              <option value={30}>30 ngày</option>
              <option value={60}>60 ngày</option>
              <option value={90}>90 ngày</option>
              <option value={180}>180 ngày</option>
            </select>
          </label>
          <button className="mt-auto inline-flex h-10 items-center gap-2 rounded-lg border border-border-subtle bg-white px-4 text-sm font-bold text-primary transition hover:border-secondary" onClick={onRefresh} type="button">
            <MaterialIcon name="refresh" size={18} />
            Tải lại
          </button>
        </div>
      )}
      description="Các chỉ số dành cho phân tích kinh tế: tăng trưởng, doanh thu, chuyển đổi, retention proxy và hành vi sản phẩm."
      title="Business analytics"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          accent="bg-emerald-600"
          icon="account_balance_wallet"
          label="Revenue"
          subValue={`AOV ${money(analytics.revenue.averageOrderValue)} · success ${percentText(analytics.revenue.paymentSuccessRate)}`}
          tone="text-emerald-700"
          value={money(analytics.revenue.total)}
        />
        <MetricCard
          icon="conversion_path"
          label="Paid conversion"
          subValue={`${numberText(analytics.growth.paidUsers)} paid / ${numberText(analytics.growth.totalUsers)} users`}
          value={percentText(analytics.growth.paidConversionRate)}
        />
        <MetricCard
          accent="bg-sky-600"
          icon="groups"
          label="Active users"
          subValue={`${numberText(analytics.growth.newUsers)} user mới trong ${analytics.period.days} ngày`}
          tone="text-sky-700"
          value={numberText(analytics.growth.activeUsers)}
        />
        <MetricCard
          accent="bg-amber-500"
          icon="auto_awesome"
          label="AI efficiency"
          subValue={`Try-on save ${percentText(analytics.ai.saveRate)} · suggestion confirm ${percentText(analytics.ai.suggestionConfirmationRate)}`}
          tone="text-amber-700"
          value={percentText(analytics.ai.successRate)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <GaugeCard
          detail={`${numberText(analytics.growth.paidUsers)} paid users`}
          label="Paid conversion"
          value={analytics.growth.paidConversionRate}
        />
        <GaugeCard
          detail={`${numberText(analytics.revenue.successfulPayments)} giao dịch thành công`}
          label="Payment success"
          value={analytics.revenue.paymentSuccessRate}
        />
        <GaugeCard
          detail="User đã kết nối Google Calendar"
          label="Calendar adoption"
          value={analytics.integrations.calendarAdoptionRate}
        />
        <GaugeCard
          detail="User đã có snapshot thời tiết"
          label="Weather adoption"
          value={analytics.integrations.weatherAdoptionRate}
        />
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <DualLineChart
          caption="So sánh user mới và user active trong cùng kỳ"
          primary={analytics.growth.newUsersByDay}
          primaryLabel="User mới"
          secondary={analytics.growth.activeUsersByDay}
          secondaryLabel="Active"
          title="Growth curve"
        />
        <DonutChart
          eyebrow="Customer base"
          items={analytics.subscriptions.usersByPlan}
          labelKey="plan"
          title="User theo gói"
          valueFormatter={numberText}
          valueKey="users"
        />
      </div>

      <div className="grid min-w-0 gap-4">
        <ChartBars
          caption={`${analytics.period.days} ngày gần nhất`}
          compactFormatter={compactMoney}
          data={analytics.revenue.revenueByDay}
          formatter={(value) => money(value)}
          label="Revenue trend"
          tone="emerald"
        />
      </div>

      <div className="grid gap-4">
        <CohortRetention cohorts={analytics.retention.cohorts} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <StackedBarChart
          eyebrow="Payment status"
          items={paymentStatusMix}
          title="Tình trạng giao dịch"
        />
        <StackedBarChart
          eyebrow="AI pipeline"
          items={tryOnStatusMix}
          title="Try-on job status"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <BreakdownList
          eyebrow="Revenue mix"
          items={analytics.revenue.revenueByPlan}
          labelKey="displayName"
          subRenderer={(item) => `${item.successfulPayments}/${item.payments} giao dịch thành công`}
          title="Doanh thu theo gói"
          valueFormatter={money}
          valueKey="revenue"
        />
        <StackedBarChart
          eyebrow="AI stylist"
          items={suggestionStatusMix}
          title="Suggestion status"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-sm shadow-primary/5">
          <p className="text-xs font-bold uppercase tracking-widest text-secondary">Wardrobe behavior</p>
          <h3 className="mt-1 text-lg font-extrabold text-primary">Chất lượng tủ đồ</h3>
          <div className="mt-5 grid gap-3">
            <SignalRow label="Avg items / user" value={analytics.product.averageItemsPerUser} />
            <SignalRow label="Tủ đồ trống" value={analytics.product.emptyWardrobeUsers} tone="text-amber-700" />
            <SignalRow label="Item yêu thích" value={percentText(analytics.product.favoriteItemRate)} />
            <SignalRow label="Item chưa từng mặc" value={percentText(analytics.product.neverWornItemRate)} tone="text-rose-700" />
          </div>
        </section>

        <DonutChart
          eyebrow="Category mix"
          items={analytics.product.categoryMix}
          labelKey="category"
          title="Món đồ theo nhóm"
          valueFormatter={numberText}
          valueKey="totalItems"
        />
      </div>

      <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-sm shadow-primary/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">AI operations</p>
            <h3 className="mt-1 text-lg font-extrabold text-primary">Người dùng tiêu thụ try-on nhiều nhất</h3>
          </div>
          <div className="rounded-lg bg-surface-container-low px-3 py-2 text-sm font-extrabold text-primary">
            Avg {analytics.ai.averageProcessingSeconds}s/job
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <SignalRow label="Try-on jobs" value={numberText(analytics.ai.trialJobs)} />
          <SignalRow label="Try-on failed" value={percentText(analytics.ai.failedTrials / Math.max(1, analytics.ai.trialJobs) * 100)} tone="text-rose-700" />
          <SignalRow label="Suggestions" value={numberText(analytics.ai.totalSuggestions)} />
          <SignalRow label="Suggestion failed" value={percentText(analytics.ai.suggestionFailureRate)} tone="text-rose-700" />
        </div>
        <div className="mt-5 overflow-hidden rounded-lg border border-border-subtle">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-surface-container-low text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Jobs</th>
                <th className="px-4 py-3">Completed</th>
                <th className="px-4 py-3">Failed</th>
                <th className="px-4 py-3">Fail rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {analytics.ai.heavyUsers.length ? analytics.ai.heavyUsers.map((user) => (
                <tr key={user.userId}>
                  <td className="px-4 py-3">
                    <p className="font-extrabold text-primary">{user.fullName}</p>
                    <p className="mt-1 text-xs font-semibold text-on-surface-variant">{user.email}</p>
                  </td>
                  <td className="px-4 py-3 font-bold text-primary">{numberText(user.trialJobs)}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">{numberText(user.completedTrials)}</td>
                  <td className="px-4 py-3 font-semibold text-rose-700">{numberText(user.failedTrials)}</td>
                  <td className="px-4 py-3 font-extrabold text-primary">{percentText((user.failedTrials / Math.max(1, user.trialJobs)) * 100)}</td>
                </tr>
              )) : (
                <tr>
                  <td className="px-4 py-6 text-center font-semibold text-on-surface-variant" colSpan={5}>Chưa có try-on jobs.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </SectionShell>
  );
}

function UsersTab({
  filters,
  loading,
  onDetail,
  onFilterChange,
  onPageChange,
  onPlanChange,
  onRefresh,
  onSearchSubmit,
  onStatusChange,
  page,
  searchDraft,
  setSearchDraft,
}) {
  const rows = page?.content || [];
  return (
    <SectionShell
      title="Quản lý người dùng"
      description="Tìm tài khoản, xem trạng thái sử dụng, khóa/mở tài khoản và cập nhật gói theo nhu cầu hỗ trợ."
      action={<button className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-white px-4 py-3 text-sm font-bold text-primary transition hover:border-secondary" onClick={onRefresh} type="button"><MaterialIcon name="refresh" size={18} />Tải lại</button>}
    >
      <div className="grid gap-3 rounded-lg border border-border-subtle bg-white p-4 lg:grid-cols-[minmax(260px,1fr)_160px_160px_160px]">
        <SearchBox
          onChange={setSearchDraft}
          onClear={() => {
            setSearchDraft('');
            onFilterChange({ q: '' });
          }}
          onSubmit={onSearchSubmit}
          placeholder="Email hoặc tên người dùng"
          value={searchDraft}
        />
        <SelectFilter label="Trạng thái" onChange={(status) => onFilterChange({ status })} options={userStatuses} value={filters.status} />
        <SelectFilter label="Gói" onChange={(plan) => onFilterChange({ plan })} options={userPlans} value={filters.plan} />
        <SelectFilter label="Role" onChange={(role) => onFilterChange({ role })} options={['', 'ADMIN', 'USER']} value={filters.role} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border-subtle bg-white">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <p className="text-sm font-bold text-primary">{pageTotal(page)} người dùng</p>
        </div>
        {loading ? (
          <div className="h-80 animate-pulse bg-surface-container-low" />
        ) : rows.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] w-full text-left text-sm">
              <thead className="bg-surface-container-low text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                <tr>
                  <th className="px-4 py-3">Người dùng</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Gói</th>
                  <th className="px-4 py-3">Tủ đồ</th>
                  <th className="px-4 py-3">Thanh toán</th>
                  <th className="px-4 py-3">Tạo lúc</th>
                  <th className="px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {rows.map((user) => (
                  <tr className="align-top transition hover:bg-surface-container-low/70" key={user.id}>
                    <td className="px-4 py-3">
                      <p className="font-extrabold text-primary">{user.fullName}</p>
                      <p className="mt-1 text-xs font-semibold text-on-surface-variant">{user.email}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {user.roles.map((role) => <StatusBadge key={role} value={role} />)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="rounded-md border border-border-subtle bg-white px-2 py-1.5 text-xs font-bold"
                        onChange={(event) => onStatusChange(user, event.target.value)}
                        value={user.status}
                      >
                        {userStatuses.filter(Boolean).map((status) => <option key={status}>{status}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="rounded-md border border-border-subtle bg-white px-2 py-1.5 text-xs font-bold"
                        onChange={(event) => onPlanChange(user, event.target.value)}
                        value={user.plan}
                      >
                        {userPlans.filter(Boolean).map((plan) => <option key={plan}>{plan}</option>)}
                      </select>
                      <p className="mt-1 text-xs text-on-surface-variant">{user.planExpiresAt ? plainDate(user.planExpiresAt) : 'Không hạn'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-extrabold text-primary">{user.wardrobeCount}</p>
                      <p className="text-xs text-on-surface-variant">{user.storageUsed}/{user.storageLimit < 0 ? '∞' : user.storageLimit}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-extrabold text-primary">{money(user.totalPaid)}</p>
                      <p className="text-xs text-on-surface-variant">{user.paymentCount} giao dịch</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-on-surface-variant">{shortDate(user.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="inline-flex items-center gap-2 rounded-md border border-border-subtle px-3 py-2 text-xs font-extrabold text-primary transition hover:border-secondary" onClick={() => onDetail(user.id)} type="button">
                        <MaterialIcon name="open_in_full" size={16} />
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyBlock title="Không có người dùng phù hợp" />
        )}
      </div>
      <Pagination page={page} onPageChange={onPageChange} />
    </SectionShell>
  );
}

function PaymentsTab({ filters, loading, onFilterChange, onPageChange, onRefresh, onSearchSubmit, page, searchDraft, setSearchDraft }) {
  const rows = page?.content || [];
  return (
    <SectionShell
      title="Giao dịch thanh toán"
      description="Theo dõi giao dịch VNPay/MoMo/BANKING theo trạng thái, transaction code và tài khoản người mua."
      action={<button className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-white px-4 py-3 text-sm font-bold text-primary transition hover:border-secondary" onClick={onRefresh} type="button"><MaterialIcon name="refresh" size={18} />Tải lại</button>}
    >
      <div className="grid gap-3 rounded-lg border border-border-subtle bg-white p-4 lg:grid-cols-[minmax(260px,1fr)_180px]">
        <SearchBox
          onChange={setSearchDraft}
          onClear={() => {
            setSearchDraft('');
            onFilterChange({ q: '' });
          }}
          onSubmit={onSearchSubmit}
          placeholder="Email, tên, mã giao dịch"
          value={searchDraft}
        />
        <SelectFilter label="Trạng thái" onChange={(status) => onFilterChange({ status })} options={paymentStatuses} value={filters.status} />
      </div>

      <DataTable empty="Không có giao dịch phù hợp" loading={loading}>
        <table className="min-w-[980px] w-full text-left text-sm">
          <thead className="bg-surface-container-low text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">Giao dịch</th>
              <th className="px-4 py-3">Người mua</th>
              <th className="px-4 py-3">Gói</th>
              <th className="px-4 py-3">Số tiền</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Thời gian</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {rows.map((payment) => (
              <tr className="hover:bg-surface-container-low/70" key={payment.id}>
                <td className="px-4 py-3">
                  <p className="font-extrabold text-primary">{payment.transactionCode || `#${payment.id}`}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">{payment.method}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-bold text-primary">{payment.userName}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">{payment.userEmail}</p>
                </td>
                <td className="px-4 py-3"><StatusBadge value={payment.planType || '-'} /></td>
                <td className="px-4 py-3 font-extrabold text-primary">{money(payment.amount, payment.currency)}</td>
                <td className="px-4 py-3"><StatusBadge value={payment.status} /></td>
                <td className="px-4 py-3 text-xs font-semibold text-on-surface-variant">{shortDate(payment.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTable>
      <Pagination page={page} onPageChange={onPageChange} />
    </SectionShell>
  );
}

function SubscriptionsTab({ filters, loading, onFilterChange, onPageChange, onRefresh, onSearchSubmit, page, searchDraft, setSearchDraft }) {
  const rows = page?.content || [];
  return (
    <SectionShell
      title="Quản lý gói sử dụng"
      description="Xem subscription đang hoạt động, pending, expired hoặc cancelled trên toàn hệ thống."
      action={<button className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-white px-4 py-3 text-sm font-bold text-primary transition hover:border-secondary" onClick={onRefresh} type="button"><MaterialIcon name="refresh" size={18} />Tải lại</button>}
    >
      <div className="grid gap-3 rounded-lg border border-border-subtle bg-white p-4 lg:grid-cols-[minmax(260px,1fr)_180px_180px]">
        <SearchBox
          onChange={setSearchDraft}
          onClear={() => {
            setSearchDraft('');
            onFilterChange({ q: '' });
          }}
          onSubmit={onSearchSubmit}
          placeholder="Email hoặc tên người dùng"
          value={searchDraft}
        />
        <SelectFilter label="Trạng thái" onChange={(status) => onFilterChange({ status })} options={subscriptionStatuses} value={filters.status} />
        <SelectFilter label="Gói" onChange={(plan) => onFilterChange({ plan })} options={userPlans} value={filters.plan} />
      </div>

      <DataTable empty="Không có subscription phù hợp" loading={loading}>
        <table className="min-w-[980px] w-full text-left text-sm">
          <thead className="bg-surface-container-low text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">Người dùng</th>
              <th className="px-4 py-3">Gói</th>
              <th className="px-4 py-3">Giá</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Thời hạn</th>
              <th className="px-4 py-3">Auto renew</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {rows.map((subscription) => (
              <tr className="hover:bg-surface-container-low/70" key={subscription.id}>
                <td className="px-4 py-3">
                  <p className="font-bold text-primary">{subscription.userName}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">{subscription.userEmail}</p>
                </td>
                <td className="px-4 py-3"><StatusBadge value={subscription.planName} /></td>
                <td className="px-4 py-3 font-extrabold text-primary">{money(subscription.price, subscription.currency)}</td>
                <td className="px-4 py-3"><StatusBadge value={subscription.status} /></td>
                <td className="px-4 py-3 text-xs font-semibold text-on-surface-variant">{plainDate(subscription.startDate)} - {plainDate(subscription.endDate)}</td>
                <td className="px-4 py-3">{subscription.autoRenew ? 'Có' : 'Không'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTable>
      <Pagination page={page} onPageChange={onPageChange} />
    </SectionShell>
  );
}

function AuditTab({ loading, onFilterChange, onPageChange, onRefresh, onSearchSubmit, page, searchDraft, setSearchDraft }) {
  const rows = page?.content || [];
  return (
    <SectionShell
      title="Audit log"
      description="Theo dõi các hành động quản trị và các thay đổi quan trọng trong hệ thống."
      action={<button className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-white px-4 py-3 text-sm font-bold text-primary transition hover:border-secondary" onClick={onRefresh} type="button"><MaterialIcon name="refresh" size={18} />Tải lại</button>}
    >
      <div className="rounded-lg border border-border-subtle bg-white p-4">
        <SearchBox
          onChange={setSearchDraft}
          onClear={() => {
            setSearchDraft('');
            onFilterChange({ q: '' });
          }}
          onSubmit={onSearchSubmit}
          placeholder="Action, entity, email actor"
          value={searchDraft}
        />
      </div>

      <DataTable empty="Chưa có audit log phù hợp" loading={loading}>
        <table className="min-w-[1060px] w-full text-left text-sm">
          <thead className="bg-surface-container-low text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">IP</th>
              <th className="px-4 py-3">Thời gian</th>
              <th className="px-4 py-3">Dữ liệu mới</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {rows.map((log) => (
              <tr className="align-top hover:bg-surface-container-low/70" key={log.id}>
                <td className="px-4 py-3 font-extrabold text-primary">{log.action}</td>
                <td className="px-4 py-3">
                  <p className="font-bold text-primary">{log.actorName || 'System'}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">{log.actorEmail || '-'}</p>
                </td>
                <td className="px-4 py-3 text-xs font-semibold text-on-surface-variant">{log.entityName || '-'} #{log.entityId || '-'}</td>
                <td className="px-4 py-3 text-xs font-semibold text-on-surface-variant">{log.ipAddress || '-'}</td>
                <td className="px-4 py-3 text-xs font-semibold text-on-surface-variant">{shortDate(log.createdAt)}</td>
                <td className="max-w-xs px-4 py-3">
                  <code className="line-clamp-2 text-xs text-on-surface-variant">{log.newValue || '-'}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTable>
      <Pagination page={page} onPageChange={onPageChange} />
    </SectionShell>
  );
}

function DataTable({ children, empty, loading }) {
  if (loading) return <div className="h-96 animate-pulse rounded-lg bg-white" />;
  const hasRows = Boolean(children?.props?.children?.[1]?.props?.children?.length);
  if (!hasRows) return <EmptyBlock title={empty} />;
  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-white">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function UserDetailDrawer({ detail, error, loading, onClose }) {
  if (!detail && !loading && !error) return null;
  const user = detail?.user;
  return (
    <div className="fixed inset-0 z-[80]">
      <button aria-label="Đóng chi tiết user" className="absolute inset-0 bg-black/30" onClick={onClose} type="button" />
      <aside className="absolute right-0 top-0 flex h-full w-[min(520px,100vw)] flex-col bg-surface-container-lowest shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">User detail</p>
            <h2 className="mt-1 text-2xl font-extrabold text-primary">{user?.fullName || 'Đang tải'}</h2>
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-subtle bg-white text-primary" onClick={onClose} type="button">
            <MaterialIcon name="close" size={20} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading && <LoadingBlock />}
          {error && <ErrorBanner message={error} />}
          {user && (
            <div className="grid gap-5">
              <section className="rounded-lg border border-border-subtle bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-primary">{user.fullName}</h3>
                    <p className="mt-1 text-sm font-semibold text-on-surface-variant">{user.email}</p>
                  </div>
                  <StatusBadge value={user.status} />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <MetricCard icon="checkroom" label="Tủ đồ" value={user.wardrobeCount} />
                  <MetricCard icon="history" label="Outfit" value={detail.stats.dailyOutfits} />
                </div>
              </section>

              <section className="rounded-lg border border-border-subtle bg-white p-5">
                <h3 className="text-lg font-extrabold text-primary">Món đồ gần đây</h3>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {(detail.recentItems || []).map((item) => (
                    <div className="rounded-lg bg-surface-container-low p-3" key={item.id}>
                      <img alt={item.name} className="h-28 w-full rounded-lg object-cover" src={item.thumbnailUrl || item.backgroundRemovedUrl || '/image/wardrobe-tee.png'} />
                      <p className="mt-2 truncate text-sm font-extrabold text-primary">{item.name}</p>
                      <p className="mt-1 text-xs font-semibold text-on-surface-variant">{item.ownerEmail}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-border-subtle bg-white p-5">
                <h3 className="text-lg font-extrabold text-primary">Thanh toán gần đây</h3>
                <div className="mt-4 grid gap-3">
                  {(detail.recentPayments || []).map((payment) => (
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low p-3" key={payment.id}>
                      <div>
                        <p className="font-extrabold text-primary">{money(payment.amount, payment.currency)}</p>
                        <p className="mt-1 text-xs text-on-surface-variant">{payment.transactionCode || `#${payment.id}`}</p>
                      </div>
                      <StatusBadge value={payment.status} />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

export function AdminPage() {
  const nav = useTopNavUser();
  const [activeTab, setActiveTab] = useState('overview');
  const [admin, setAdmin] = useState(null);
  const [gateLoading, setGateLoading] = useState(true);
  const [gateError, setGateError] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [toast, setToast] = useState('');
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [usersPage, setUsersPage] = useState(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersFilters, setUsersFilters] = useState({ q: '', status: '', plan: '', role: '' });
  const [usersSearchDraft, setUsersSearchDraft] = useState('');
  const [usersPageIndex, setUsersPageIndex] = useState(0);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [selectedUserError, setSelectedUserError] = useState('');
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);

  const [paymentsPage, setPaymentsPage] = useState(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentFilters, setPaymentFilters] = useState({ q: '', status: '' });
  const [paymentSearchDraft, setPaymentSearchDraft] = useState('');
  const [paymentsPageIndex, setPaymentsPageIndex] = useState(0);

  const [subscriptionsPage, setSubscriptionsPage] = useState(null);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subscriptionFilters, setSubscriptionFilters] = useState({ q: '', status: '', plan: '' });
  const [subscriptionSearchDraft, setSubscriptionSearchDraft] = useState('');
  const [subscriptionsPageIndex, setSubscriptionsPageIndex] = useState(0);

  const [auditPage, setAuditPage] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilters, setAuditFilters] = useState({ q: '' });
  const [auditSearchDraft, setAuditSearchDraft] = useState('');
  const [auditPageIndex, setAuditPageIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    adminApi.me()
      .then((data) => {
        if (!cancelled) setAdmin(data);
      })
      .catch((err) => {
        if (!cancelled) setGateError(err.message || 'Không có quyền truy cập admin.');
      })
      .finally(() => {
        if (!cancelled) setGateLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadOverview = useCallback(() => {
    setOverviewLoading(true);
    setGlobalError('');
    return adminApi.overview()
      .then(setOverview)
      .catch((err) => setGlobalError(err.message || 'Không tải được tổng quan admin.'))
      .finally(() => setOverviewLoading(false));
  }, []);

  const loadAnalytics = useCallback(() => {
    setAnalyticsLoading(true);
    setGlobalError('');
    return adminApi.analytics({ days: analyticsDays })
      .then(setAnalytics)
      .catch((err) => setGlobalError(err.message || 'Không tải được analytics admin.'))
      .finally(() => setAnalyticsLoading(false));
  }, [analyticsDays]);

  const loadUsers = useCallback(() => {
    setUsersLoading(true);
    setGlobalError('');
    return adminApi.users({ ...usersFilters, page: usersPageIndex, size: 20 })
      .then(setUsersPage)
      .catch((err) => setGlobalError(err.message || 'Không tải được danh sách user.'))
      .finally(() => setUsersLoading(false));
  }, [usersFilters, usersPageIndex]);

  const loadPayments = useCallback(() => {
    setPaymentsLoading(true);
    setGlobalError('');
    return adminApi.payments({ ...paymentFilters, page: paymentsPageIndex, size: 20 })
      .then(setPaymentsPage)
      .catch((err) => setGlobalError(err.message || 'Không tải được danh sách thanh toán.'))
      .finally(() => setPaymentsLoading(false));
  }, [paymentFilters, paymentsPageIndex]);

  const loadSubscriptions = useCallback(() => {
    setSubscriptionsLoading(true);
    setGlobalError('');
    return adminApi.subscriptions({ ...subscriptionFilters, page: subscriptionsPageIndex, size: 20 })
      .then(setSubscriptionsPage)
      .catch((err) => setGlobalError(err.message || 'Không tải được danh sách subscription.'))
      .finally(() => setSubscriptionsLoading(false));
  }, [subscriptionFilters, subscriptionsPageIndex]);

  const loadAudit = useCallback(() => {
    setAuditLoading(true);
    setGlobalError('');
    return adminApi.auditLogs({ ...auditFilters, page: auditPageIndex, size: 20 })
      .then(setAuditPage)
      .catch((err) => setGlobalError(err.message || 'Không tải được audit log.'))
      .finally(() => setAuditLoading(false));
  }, [auditFilters, auditPageIndex]);

  useEffect(() => {
    if (!admin) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (activeTab === 'overview') loadOverview();
      if (activeTab === 'analytics') loadAnalytics();
      if (activeTab === 'users') loadUsers();
      if (activeTab === 'payments') loadPayments();
      if (activeTab === 'subscriptions') loadSubscriptions();
      if (activeTab === 'audit') loadAudit();
    });
    return () => {
      cancelled = true;
    };
  }, [activeTab, admin, loadAnalytics, loadAudit, loadOverview, loadPayments, loadSubscriptions, loadUsers]);

  const activeLabel = useMemo(() => tabs.find((tab) => tab.key === activeTab)?.label || 'Admin', [activeTab]);

  const handleNotify = () => {
    window.alert(topNavData.notificationMessage);
  };

  const patchUsersFilter = (patch) => {
    setUsersPageIndex(0);
    setUsersFilters((current) => ({ ...current, ...patch }));
  };

  const patchPaymentFilter = (patch) => {
    setPaymentsPageIndex(0);
    setPaymentFilters((current) => ({ ...current, ...patch }));
  };

  const patchSubscriptionFilter = (patch) => {
    setSubscriptionsPageIndex(0);
    setSubscriptionFilters((current) => ({ ...current, ...patch }));
  };

  const patchAuditFilter = (patch) => {
    setAuditPageIndex(0);
    setAuditFilters((current) => ({ ...current, ...patch }));
  };

  const openUserDetail = async (userId) => {
    setSelectedUserDetail(null);
    setSelectedUserError('');
    setSelectedUserLoading(true);
    try {
      const detail = await adminApi.userDetail(userId);
      setSelectedUserDetail(detail);
    } catch (err) {
      setSelectedUserError(err.message || 'Không tải được chi tiết user.');
    } finally {
      setSelectedUserLoading(false);
    }
  };

  const updateUserStatus = async (user, status) => {
    if (status === user.status) return;
    if (!window.confirm(`Đổi trạng thái ${user.email} thành ${status}?`)) return;
    try {
      await adminApi.updateUserStatus(user.id, status);
      setToast('Đã cập nhật trạng thái người dùng.');
      await loadUsers();
      await loadOverview();
    } catch (err) {
      setGlobalError(err.message || 'Không cập nhật được trạng thái user.');
    }
  };

  const updateUserPlan = async (user, plan) => {
    if (plan === user.plan) return;
    if (!window.confirm(`Cập nhật gói ${user.email} thành ${plan}?`)) return;
    try {
      await adminApi.updateUserPlan(user.id, { plan });
      setToast('Đã cập nhật gói người dùng.');
      await loadUsers();
      await loadOverview();
    } catch (err) {
      setGlobalError(err.message || 'Không cập nhật được gói user.');
    }
  };

  if (gateLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-container-low">
        <div className="rounded-lg border border-border-subtle bg-white p-8 text-center shadow-lg shadow-primary/5">
          <LogoMark className="mx-auto h-12 w-12" />
          <p className="mt-3 text-sm font-bold text-on-surface-variant">Đang kiểm tra quyền admin...</p>
        </div>
      </main>
    );
  }

  if (gateError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-container-low px-4">
        <section className="max-w-md rounded-lg border border-border-subtle bg-white p-8 text-center shadow-lg shadow-primary/5">
          <MaterialIcon name="lock" size={34} className="mx-auto text-rose-600" />
          <h1 className="mt-4 text-2xl font-extrabold text-primary">Không có quyền admin</h1>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">{gateError}</p>
          <a className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white" href="#/home">
            <MaterialIcon name="arrow_back" size={18} />
            Về trang chủ
          </a>
        </section>
      </main>
    );
  }

  return (
    <>
      <AdminSidebar activeTab={activeTab} onChange={setActiveTab} />
      <TopNav data={nav} onNotify={handleNotify} />

      {toast && (
        <div className="fixed right-6 top-24 z-[90] flex w-[min(380px,calc(100vw-2rem))] items-start gap-3 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-primary shadow-lg shadow-primary/10" role="status">
          <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <MaterialIcon name="check_circle" filled size={20} />
          </span>
          <span className="min-w-0 flex-1 pt-1">{toast}</span>
          <button className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-surface-container-low hover:text-primary" onClick={() => setToast('')} type="button">
            <MaterialIcon name="close" size={18} />
          </button>
        </div>
      )}

      <main className="ml-64 min-h-screen overflow-x-hidden bg-surface-container-low px-8 pb-12 pt-24">
        <div className="mx-auto grid max-w-[1440px] min-w-0 gap-6">
          <header className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-white p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-secondary">Shelfy operations</p>
              <h1 className="mt-1 text-2xl font-extrabold text-primary">{activeLabel}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(admin?.roles || []).map((role) => <StatusBadge key={role} value={role} />)}
              <a className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-sm font-bold text-primary transition hover:border-secondary" href="#/home">
                <MaterialIcon name="storefront" size={18} />
                Mở app
              </a>
            </div>
          </header>

          <ErrorBanner
            message={globalError}
            onRetry={() => {
              if (activeTab === 'overview') loadOverview();
              if (activeTab === 'analytics') loadAnalytics();
              if (activeTab === 'users') loadUsers();
              if (activeTab === 'payments') loadPayments();
              if (activeTab === 'subscriptions') loadSubscriptions();
              if (activeTab === 'audit') loadAudit();
            }}
          />

          {activeTab === 'overview' && <OverviewTab loading={overviewLoading} overview={overview} />}

          {activeTab === 'analytics' && (
            <AnalyticsTab
              analytics={analytics}
              days={analyticsDays}
              loading={analyticsLoading}
              onDaysChange={setAnalyticsDays}
              onRefresh={loadAnalytics}
            />
          )}

          {activeTab === 'users' && (
            <UsersTab
              filters={usersFilters}
              loading={usersLoading}
              onDetail={openUserDetail}
              onFilterChange={patchUsersFilter}
              onPageChange={setUsersPageIndex}
              onPlanChange={updateUserPlan}
              onRefresh={loadUsers}
              onSearchSubmit={(event) => {
                event.preventDefault();
                patchUsersFilter({ q: usersSearchDraft.trim() });
              }}
              onStatusChange={updateUserStatus}
              page={usersPage}
              searchDraft={usersSearchDraft}
              setSearchDraft={setUsersSearchDraft}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsTab
              filters={paymentFilters}
              loading={paymentsLoading}
              onFilterChange={patchPaymentFilter}
              onPageChange={setPaymentsPageIndex}
              onRefresh={loadPayments}
              onSearchSubmit={(event) => {
                event.preventDefault();
                patchPaymentFilter({ q: paymentSearchDraft.trim() });
              }}
              page={paymentsPage}
              searchDraft={paymentSearchDraft}
              setSearchDraft={setPaymentSearchDraft}
            />
          )}

          {activeTab === 'subscriptions' && (
            <SubscriptionsTab
              filters={subscriptionFilters}
              loading={subscriptionsLoading}
              onFilterChange={patchSubscriptionFilter}
              onPageChange={setSubscriptionsPageIndex}
              onRefresh={loadSubscriptions}
              onSearchSubmit={(event) => {
                event.preventDefault();
                patchSubscriptionFilter({ q: subscriptionSearchDraft.trim() });
              }}
              page={subscriptionsPage}
              searchDraft={subscriptionSearchDraft}
              setSearchDraft={setSubscriptionSearchDraft}
            />
          )}

          {activeTab === 'audit' && (
            <AuditTab
              loading={auditLoading}
              onFilterChange={patchAuditFilter}
              onPageChange={setAuditPageIndex}
              onRefresh={loadAudit}
              onSearchSubmit={(event) => {
                event.preventDefault();
                patchAuditFilter({ q: auditSearchDraft.trim() });
              }}
              page={auditPage}
              searchDraft={auditSearchDraft}
              setSearchDraft={setAuditSearchDraft}
            />
          )}
        </div>
      </main>

      <UserDetailDrawer
        detail={selectedUserDetail}
        error={selectedUserError}
        loading={selectedUserLoading}
        onClose={() => {
          setSelectedUserDetail(null);
          setSelectedUserError('');
          setSelectedUserLoading(false);
        }}
      />
    </>
  );
}
