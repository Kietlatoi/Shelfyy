import { useCallback, useEffect, useState } from 'react';
import { dailyOutfitApi } from '../api/dailyOutfitApi';
import { MaterialIcon } from '../components/MaterialIcon';
import { Sidebar } from '../components/Sidebar';
import { TopNav } from '../components/TopNav';
import { sidebarData, topNavData } from '../const/homeData';
import { useTopNavUser } from '../hooks/useTopNavUser';

const fallbackImage = '/image/wardrobe-tee.png';
const pageSize = 8;

function imageForItem(item) {
  return item?.thumbnailUrl || item?.imageUrl || item?.backgroundRemovedUrl || fallbackImage;
}

function formatLongDate(value) {
  if (!value) return 'Không rõ ngày';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatShortDate(value) {
  if (!value) return '--';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function itemLabel(item) {
  return [item?.brand, item?.color].filter(Boolean).join(' · ') || item?.category || 'Món đồ';
}

function HistorySkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="h-40 animate-pulse rounded-lg bg-white" key={index} />
      ))}
    </div>
  );
}

function EmptyHistory({ onCreateClick }) {
  return (
    <section className="rounded-lg border border-dashed border-border-subtle bg-white p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-secondary-fixed text-secondary">
        <MaterialIcon name="history" size={26} />
      </div>
      <h2 className="mt-4 text-xl font-extrabold text-primary">Chưa có lịch sử mặc</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-on-surface-variant">
        Khi bạn xác nhận outfit mặc hôm nay ở tủ đồ, lịch sử sẽ được lưu lại theo từng ngày.
      </p>
      <a
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-container"
        href="#/wardrobe"
        onClick={onCreateClick}
      >
        <MaterialIcon name="checkroom" size={18} />
        Chọn outfit hôm nay
      </a>
    </section>
  );
}

function HistoryCard({ entry }) {
  const outfit = entry.outfit || {};
  const items = Array.isArray(outfit.items) ? outfit.items : [];
  const visibleItems = items.slice(0, 5);
  const confirmedTime = formatTime(entry.confirmedAt);
  const weather = entry.weather;
  const calendarEvent = entry.calendarEvent;

  return (
    <article className="grid gap-4 rounded-lg border border-border-subtle bg-white p-4 shadow-sm shadow-primary/5 transition hover:border-primary/20 hover:shadow-lg hover:shadow-primary/10 lg:grid-cols-[112px_1fr]">
      <div className="flex items-center gap-3 lg:block">
        <div className="flex h-20 w-20 flex-none flex-col items-center justify-center rounded-lg bg-primary text-center text-white lg:h-24 lg:w-24">
          <span className="text-[11px] font-bold uppercase tracking-widest opacity-80">Ngày</span>
          <span className="mt-1 text-lg font-extrabold">{formatShortDate(entry.wornDate)}</span>
        </div>
        <div className="lg:hidden">
          <h2 className="text-lg font-extrabold text-primary">{outfit.name || 'Outfit đã mặc'}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">{formatLongDate(entry.wornDate)}</p>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="hidden min-w-0 lg:block">
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">
              {formatLongDate(entry.wornDate)}
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-primary">{outfit.name || 'Outfit đã mặc'}</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {confirmedTime && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-low px-3 py-1.5 text-xs font-bold text-on-surface-variant">
                <MaterialIcon name="event_available" size={16} />
                Xác nhận {confirmedTime}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary-fixed px-3 py-1.5 text-xs font-extrabold text-secondary">
              <MaterialIcon name="laundry" size={16} />
              {items.length} món
            </span>
          </div>
        </div>

        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {visibleItems.map((item) => (
            <div className="w-24 flex-none" key={item.id}>
              <img
                alt={item.name || 'Món đồ'}
                className="h-24 w-24 rounded-lg bg-surface-container object-cover"
                src={imageForItem(item)}
              />
              <p className="mt-2 truncate text-xs font-extrabold text-primary">{item.name || 'Món đồ'}</p>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-on-surface-variant">{itemLabel(item)}</p>
            </div>
          ))}
          {items.length > visibleItems.length && (
            <div className="flex h-24 w-24 flex-none items-center justify-center rounded-lg border border-dashed border-border-subtle bg-surface-container-low text-sm font-extrabold text-on-surface-variant">
              +{items.length - visibleItems.length}
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-2 border-t border-border-subtle pt-4 md:grid-cols-2">
          <div className="rounded-lg bg-surface-container-low p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Thời tiết</p>
            <p className="mt-1 text-sm font-extrabold text-primary">
              {weather ? `${weather.location || 'Vị trí hiện tại'} · ${weather.temperature != null ? `${Math.round(weather.temperature)}°` : '--'} · ${weather.condition || 'Không rõ'}` : 'Chưa gắn snapshot thời tiết'}
            </p>
          </div>
          <div className="rounded-lg bg-surface-container-low p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Lịch trình</p>
            <p className="mt-1 truncate text-sm font-extrabold text-primary">
              {calendarEvent?.title || 'Chưa gắn sự kiện calendar'}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export function WearHistoryPage() {
  const nav = useTopNavUser();
  const [draftFilters, setDraftFilters] = useState({ from: '', to: '' });
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [page, setPage] = useState(0);
  const [historyPage, setHistoryPage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await dailyOutfitApi.list({
        page,
        size: pageSize,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
      setHistoryPage(data);
    } catch (err) {
      setError(err.message || 'Không tải được lịch sử mặc');
    } finally {
      setIsLoading(false);
    }
  }, [filters.from, filters.to, page]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) loadHistory();
    });
    return () => {
      cancelled = true;
    };
  }, [loadHistory]);

  const handleNotify = () => {
    window.alert(topNavData.notificationMessage);
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setDraftFilters((current) => ({ ...current, [name]: value }));
  };

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    setPage(0);
    setFilters(draftFilters);
  };

  const handleFilterClear = () => {
    const empty = { from: '', to: '' };
    setDraftFilters(empty);
    setFilters(empty);
    setPage(0);
  };

  const content = Array.isArray(historyPage?.content) ? historyPage.content : [];
  const totalElements = Number(historyPage?.totalElements || 0);
  const totalPages = Number(historyPage?.totalPages || 0);
  const isFirst = historyPage?.first ?? page === 0;
  const isLast = historyPage?.last ?? true;

  return (
    <>
      <Sidebar activeKey="wearHistory" data={sidebarData} />
      <TopNav data={nav} onNotify={handleNotify} />

      <main className="ml-64 min-h-screen bg-surface-container-low px-10 pb-12 pt-24">
        <div className="mx-auto grid max-w-[1200px] gap-6">
          <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-secondary">Wear history</p>
              <h1 className="mt-2 text-4xl font-extrabold text-primary">Lịch sử outfit đã mặc</h1>
              <p className="mt-3 max-w-2xl text-sm text-on-surface-variant">
                Theo dõi những outfit đã xác nhận mặc trong từng ngày, kèm thời tiết và lịch trình nếu có.
              </p>
            </div>
            <a
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-container"
              href="#/wardrobe"
            >
              <MaterialIcon name="add_task" size={18} />
              Xác nhận outfit hôm nay
            </a>
          </section>

          <section className="grid gap-4 rounded-lg border border-border-subtle bg-white p-4 md:grid-cols-[1fr_auto] md:items-end">
            <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end" onSubmit={handleFilterSubmit}>
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Từ ngày</span>
                <input
                  className="rounded-lg border border-border-subtle bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  name="from"
                  onChange={handleFilterChange}
                  type="date"
                  value={draftFilters.from}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Đến ngày</span>
                <input
                  className="rounded-lg border border-border-subtle bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  name="to"
                  onChange={handleFilterChange}
                  type="date"
                  value={draftFilters.to}
                />
              </label>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-container"
                type="submit"
              >
                <MaterialIcon name="filter_alt" size={18} />
                Lọc
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-subtle bg-white px-4 py-2.5 text-sm font-bold text-on-surface-variant transition hover:border-primary hover:text-primary"
                onClick={handleFilterClear}
                type="button"
              >
                <MaterialIcon name="restart_alt" size={18} />
                Xóa lọc
              </button>
            </form>
            <div className="rounded-lg bg-surface-container-low px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Tổng lần mặc</p>
              <p className="mt-1 text-2xl font-extrabold text-primary">{totalElements.toLocaleString('vi-VN')}</p>
            </div>
          </section>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600" role="alert">
              {error}
            </div>
          )}

          {isLoading ? (
            <HistorySkeleton />
          ) : content.length ? (
            <section className="grid gap-4" aria-label="Danh sách outfit đã mặc">
              {content.map((entry) => (
                <HistoryCard entry={entry} key={entry.id} />
              ))}
            </section>
          ) : (
            <EmptyHistory />
          )}

          {!isLoading && totalPages > 1 && (
            <nav className="flex items-center justify-between rounded-lg border border-border-subtle bg-white p-3" aria-label="Phân trang lịch sử mặc">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-subtle bg-white px-4 py-2.5 text-sm font-bold text-on-surface-variant transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isFirst}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                type="button"
              >
                <MaterialIcon name="chevron_left" size={18} />
                Trang trước
              </button>
              <span className="text-sm font-bold text-on-surface-variant">
                Trang {page + 1} / {totalPages}
              </span>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-subtle bg-white px-4 py-2.5 text-sm font-bold text-on-surface-variant transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLast}
                onClick={() => setPage((current) => current + 1)}
                type="button"
              >
                Trang sau
                <MaterialIcon name="chevron_right" size={18} />
              </button>
            </nav>
          )}
        </div>
      </main>
    </>
  );
}
