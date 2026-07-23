import { useCallback, useEffect, useMemo, useState } from 'react';
import { dailyOutfitApi } from '../api/dailyOutfitApi';
import { suggestionApi } from '../api/suggestionApi';
import { weatherApi } from '../api/weatherApi';
import { MaterialIcon } from '../components/MaterialIcon';
import { Sidebar } from '../components/Sidebar';
import { TopNav } from '../components/TopNav';
import { sidebarData, topNavData } from '../const/homeData';
import { useTopNavUser } from '../hooks/useTopNavUser';
import { getCurrentBrowserLocation } from '../utils/geolocation';

const fallbackImage = '/image/wardrobe-tee.png';

const categoryLabels = {
  TOP: 'Áo',
  OUTERWEAR: 'Áo khoác',
  BOTTOM: 'Quần',
  DRESS: 'Váy',
  SHOES: 'Giày',
  BAG: 'Túi',
  ACCESSORY: 'Phụ kiện',
  OTHER: 'Khác',
};

const categoryTones = {
  TOP: 'border-sky-100 bg-sky-50 text-sky-700',
  OUTERWEAR: 'border-indigo-100 bg-indigo-50 text-indigo-700',
  BOTTOM: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  DRESS: 'border-rose-100 bg-rose-50 text-rose-700',
  SHOES: 'border-amber-100 bg-amber-50 text-amber-700',
  BAG: 'border-orange-100 bg-orange-50 text-orange-700',
  ACCESSORY: 'border-pink-100 bg-pink-50 text-pink-700',
  OTHER: 'border-border-subtle bg-surface-container text-primary',
};

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatLongDate(value) {
  const source = value || localDateValue();
  const date = new Date(`${source}T12:00:00`);
  if (Number.isNaN(date.getTime())) return source;
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatTemperature(value) {
  return value == null ? '--' : `${Math.round(Number(value))}°`;
}

function formatMetric(value, suffix) {
  if (value == null || value === '') return '--';
  return `${value}${suffix || ''}`;
}

function confidenceLabel(value) {
  if (value == null) return 'Đang đánh giá';
  return `${Math.round(Number(value) * 100)}% phù hợp`;
}

function imageForItem(item) {
  return item?.thumbnailUrl || item?.imageUrl || item?.backgroundRemovedUrl || fallbackImage;
}

function categoryLabel(value) {
  const key = String(value || 'OTHER').toUpperCase();
  return categoryLabels[key] || key;
}

function StatusToast({ message, onClose }) {
  if (!message) return null;
  return (
    <div
      aria-live="polite"
      className="fixed right-6 top-24 z-50 flex w-[min(380px,calc(100vw-2rem))] items-start gap-3 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-primary shadow-lg shadow-primary/10"
      role="status"
    >
      <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
        <MaterialIcon name="check_circle" filled size={20} />
      </span>
      <span className="min-w-0 flex-1 pt-1">{message}</span>
      <button
        aria-label="Đóng thông báo"
        className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-surface-container-low hover:text-primary"
        onClick={onClose}
        type="button"
      >
        <MaterialIcon name="close" size={18} />
      </button>
    </div>
  );
}

function SuggestSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]" aria-busy="true">
      <div className="h-[520px] animate-pulse rounded-lg bg-white" />
      <div className="h-[520px] animate-pulse rounded-lg bg-white" />
    </div>
  );
}

function ContextMetric({ icon, label, value, tone = 'text-primary' }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
        <MaterialIcon name={icon} size={18} />
        {label}
      </div>
      <p className={`mt-3 text-xl font-extrabold ${tone}`}>{value}</p>
    </div>
  );
}

function suggestionEngineLabel(value) {
  const engine = String(value || '').toLowerCase();
  if (engine.includes('rule-based')) return 'Luật phối đồ';
  if (engine.includes('gemini')) return 'Gemini';
  return value || 'Stylist tự động';
}

function EmptySuggestion({ context, isGenerating, onGenerate }) {
  const wardrobeCount = Number(context?.wardrobeCount || 0);
  const canGenerate = wardrobeCount > 0 && !isGenerating;
  return (
    <section className="rounded-lg border border-border-subtle bg-white p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-secondary-fixed text-secondary">
        <MaterialIcon name="auto_awesome" size={28} />
      </div>
      <h2 className="mt-5 text-3xl font-extrabold leading-tight text-primary">
        Chưa có gợi ý cho hôm nay
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant">
        Shelfy sẽ dùng luật phối đồ, snapshot thời tiết gần nhất và lịch trình đã đồng bộ để tạo outfit cho ngày hiện tại.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <ContextMetric
          icon="checkroom"
          label="Tủ đồ"
          value={`${wardrobeCount} món`}
          tone={wardrobeCount ? 'text-primary' : 'text-rose-600'}
        />
        <ContextMetric
          icon="wb_sunny"
          label="Thời tiết"
          value={context?.weather ? context.weather.location : 'Chưa có'}
          tone={context?.weather ? 'text-primary' : 'text-amber-700'}
        />
        <ContextMetric
          icon="event"
          label="Lịch trình"
          value={`${context?.events?.length || 0} sự kiện`}
        />
      </div>

      <div className="mt-7 flex flex-wrap gap-3">
        <button
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-on-surface-variant"
          disabled={!canGenerate}
          onClick={onGenerate}
          type="button"
        >
          <MaterialIcon name={isGenerating ? 'progress_activity' : 'auto_awesome'} size={18} />
          {isGenerating ? 'Đang tạo gợi ý' : 'Tạo gợi ý'}
        </button>
        {!wardrobeCount && (
          <a
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-subtle bg-white px-5 py-3 text-sm font-bold text-primary transition hover:border-primary"
            href="#/wardrobe"
          >
            <MaterialIcon name="add_photo_alternate" size={18} />
            Thêm món đồ
          </a>
        )}
      </div>
    </section>
  );
}

function SuggestionItemCard({ item }) {
  const category = String(item.category || item.slotName || 'OTHER').toUpperCase();
  const tone = categoryTones[category] || categoryTones.OTHER;
  const colorHex = item.colorHex && /^#[0-9a-f]{6}$/i.test(item.colorHex) ? item.colorHex : null;

  return (
    <article className="grid gap-4 rounded-lg border border-border-subtle bg-white p-3 shadow-sm shadow-primary/5 sm:grid-cols-[112px_1fr]">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-container">
        <img
          alt={item.name || 'Món đồ'}
          className="h-full w-full object-cover"
          onError={(event) => {
            if (event.currentTarget.src.includes(fallbackImage)) return;
            event.currentTarget.src = fallbackImage;
          }}
          src={imageForItem(item)}
        />
      </div>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ${tone}`}>
              {categoryLabel(category)}
            </span>
            <h3 className="mt-2 text-lg font-extrabold leading-6 text-primary">{item.name || 'Món đồ'}</h3>
            <p className="mt-1 truncate text-xs font-bold uppercase tracking-[0.16em] text-secondary">
              {item.brand || 'Khác'}
            </p>
          </div>
          {colorHex && (
            <span
              aria-label={item.color || 'Màu trang phục'}
              className="mt-1 h-5 w-5 flex-none rounded-full border border-border-subtle shadow-inner"
              style={{ backgroundColor: colorHex }}
              title={item.color || colorHex}
            />
          )}
        </div>

        <p className="mt-3 text-sm leading-6 text-on-surface-variant">
          {item.selectionReason || 'Được chọn để cân bằng tổng thể outfit.'}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {item.color && (
            <span className="rounded-md bg-surface-container-low px-2 py-1 text-xs font-bold text-on-surface-variant">
              {item.color}
            </span>
          )}
          {item.material && (
            <span className="rounded-md bg-surface-container-low px-2 py-1 text-xs font-bold text-on-surface-variant">
              {item.material}
            </span>
          )}
          {item.size && (
            <span className="rounded-md bg-surface-container-low px-2 py-1 text-xs font-bold text-on-surface-variant">
              Size {item.size}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function SuggestionPanel({
  isConfirming,
  isGenerating,
  onConfirm,
  onGenerate,
  suggestion,
}) {
  const items = Array.isArray(suggestion?.items) ? suggestion.items : [];
  const confirmed = suggestion?.status === 'CONFIRMED';

  return (
    <section className="rounded-lg border border-border-subtle bg-white">
      <div className="grid gap-5 border-b border-border-subtle p-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-secondary">Stylist tự động</p>
          <h2 className="mt-2 text-3xl font-extrabold leading-tight text-primary">
            {suggestion?.title || 'Outfit gợi ý hôm nay'}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-on-surface-variant">
            {suggestion?.summary || suggestion?.reason || 'Gợi ý được tạo từ dữ liệu tủ đồ hiện tại.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary-fixed px-3 py-1.5 text-xs font-extrabold text-secondary">
              <MaterialIcon name="verified" size={16} />
              {confidenceLabel(suggestion?.confidence)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-low px-3 py-1.5 text-xs font-bold text-on-surface-variant">
              <MaterialIcon name="psychology" size={16} />
              {suggestionEngineLabel(suggestion?.modelName)}
            </span>
            {confirmed && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">
                <MaterialIcon name="event_available" filled size={16} />
                Đã xác nhận mặc hôm nay
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-subtle bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isGenerating}
            onClick={onGenerate}
            type="button"
          >
            <MaterialIcon name={isGenerating ? 'progress_activity' : 'refresh'} size={18} />
            {isGenerating ? 'Đang tạo' : 'Gợi ý mới'}
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-on-surface-variant"
            disabled={confirmed || isConfirming || !items.length}
            onClick={onConfirm}
            type="button"
          >
            <MaterialIcon name={confirmed ? 'check_circle' : 'add_task'} filled={confirmed} size={18} />
            {confirmed ? 'Đã xác nhận' : isConfirming ? 'Đang lưu' : 'Xác nhận mặc hôm nay'}
          </button>
        </div>
      </div>

      <div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-3">
          {items.map((item) => (
            <SuggestionItemCard item={item} key={item.id} />
          ))}
        </div>

        <aside className="grid content-start gap-4">
          <div className="rounded-lg bg-surface-container-low p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Lý do phối</p>
            <p className="mt-3 text-sm leading-6 text-primary">{suggestion?.reason || 'Chưa có lý do chi tiết.'}</p>
          </div>

          <div className="rounded-lg bg-surface-container-low p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Ghi chú</p>
            <div className="mt-3 grid gap-2">
              {(suggestion?.tips?.length ? suggestion.tips : ['Có thể xác nhận để lưu outfit vào lịch sử mặc.']).map((tip) => (
                <div className="flex gap-2 text-sm leading-5 text-primary" key={tip}>
                  <MaterialIcon name="tips_and_updates" size={17} className="mt-0.5 text-secondary" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>

          <a
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-subtle bg-white px-4 py-3 text-sm font-bold text-primary transition hover:border-primary"
            href="#/trial"
          >
            <MaterialIcon name="accessibility_new" size={18} />
            Sang thử đồ AI
          </a>
        </aside>
      </div>
    </section>
  );
}

function ContextPanel({ context }) {
  const weather = context?.weather;
  const events = Array.isArray(context?.events) ? context.events : [];

  return (
    <aside className="grid content-start gap-4">
      <section className="rounded-lg border border-border-subtle bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-secondary">Nguồn dữ liệu</p>
        <h2 className="mt-2 text-2xl font-extrabold text-primary">{formatLongDate(context?.date)}</h2>
        <div className="mt-5 grid gap-3">
          <ContextMetric
            icon="checkroom"
            label="Item khả dụng"
            value={`${context?.wardrobeCount || 0} món`}
          />
          <ContextMetric
            icon={weather?.icon || 'wb_sunny'}
            label="Thời tiết"
            value={weather ? `${weather.location} · ${formatTemperature(weather.temperature)}` : 'Chưa có'}
            tone={weather ? 'text-primary' : 'text-amber-700'}
          />
          <ContextMetric
            icon="event"
            label="Calendar"
            value={`${events.length} sự kiện`}
          />
        </div>
      </section>

      <section className="rounded-lg border border-border-subtle bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Thời tiết</p>
            <h3 className="mt-1 text-lg font-extrabold text-primary">{weather?.condition || 'Chưa có dữ liệu'}</h3>
          </div>
          <MaterialIcon name={weather?.icon || 'cloud_off'} size={28} className="text-secondary" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-surface-container-low p-3">
            <p className="text-[10px] font-bold uppercase text-on-surface-variant">Độ ẩm</p>
            <p className="mt-1 text-sm font-extrabold text-primary">{formatMetric(weather?.humidity, '%')}</p>
          </div>
          <div className="rounded-lg bg-surface-container-low p-3">
            <p className="text-[10px] font-bold uppercase text-on-surface-variant">Gió</p>
            <p className="mt-1 text-sm font-extrabold text-primary">{formatMetric(weather?.windSpeed, ' km/h')}</p>
          </div>
          <div className="rounded-lg bg-surface-container-low p-3">
            <p className="text-[10px] font-bold uppercase text-on-surface-variant">Mây</p>
            <p className="mt-1 text-sm font-extrabold text-primary">{formatMetric(weather?.cloudCover, '%')}</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border-subtle bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Lịch trình</p>
            <h3 className="mt-1 text-lg font-extrabold text-primary">Hôm nay</h3>
          </div>
          <a
            aria-label="Mở Google Calendar"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-subtle text-primary transition hover:border-primary"
            href="https://calendar.google.com/calendar/u/0/r"
          >
            <MaterialIcon name="open_in_new" size={18} />
          </a>
        </div>
        <div className="mt-4 grid gap-3">
          {events.length ? events.slice(0, 5).map((event) => (
            <div className="grid gap-1 rounded-lg bg-surface-container-low p-3" key={event.id || event.title}>
              <p className="text-sm font-extrabold text-primary">{event.title}</p>
              <p className="text-xs font-semibold text-on-surface-variant">
                {[event.startTime, event.endTime].filter(Boolean).join(' - ') || 'Cả ngày'}
              </p>
              {event.location && (
                <p className="truncate text-xs font-semibold text-on-surface-variant">{event.location}</p>
              )}
            </div>
          )) : (
            <div className="rounded-lg bg-surface-container-low p-4 text-sm font-semibold text-on-surface-variant">
              Chưa có sự kiện calendar đã đồng bộ.
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}

export function SuggestPage() {
  const nav = useTopNavUser();
  const [latest, setLatest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadLatest = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await suggestionApi.latestToday();
      setLatest(data);
    } catch (err) {
      setError(err.message || 'Không tải được gợi ý hôm nay');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(async () => {
      if (cancelled) return;
      await loadLatest();
    });
    return () => {
      cancelled = true;
    };
  }, [loadLatest]);

  const suggestion = latest?.suggestion || null;
  const context = useMemo(() => suggestion?.context || latest?.context || {}, [latest, suggestion]);

  const refreshWeatherSnapshot = async () => {
    try {
      const location = await getCurrentBrowserLocation();
      await weatherApi.createSnapshot(location);
      setNotice('');
    } catch (err) {
      setNotice(err.message || 'Không cập nhật được thời tiết hiện tại.');
    }
  };

  const handleGenerate = async () => {
    setError('');
    setNotice('');
    setIsGenerating(true);
    try {
      await refreshWeatherSnapshot();
      const generated = await suggestionApi.generateToday();
      setLatest({
        generated: true,
        aiConfigured: true,
        suggestionEngine: generated?.modelName || 'rule-based-v1',
        suggestion: generated,
      });
      setToast('Đã tạo gợi ý cho hôm nay.');
    } catch (err) {
      setError(err.message || 'Không tạo được gợi ý hôm nay');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirm = async () => {
    const itemIds = (suggestion?.items || []).map((item) => Number(item.id)).filter(Boolean);
    if (!suggestion?.id || !itemIds.length) return;

    setError('');
    setIsConfirming(true);
    try {
      const result = await dailyOutfitApi.confirmToday({
        name: suggestion.title || `Outfit gợi ý - ${formatLongDate(suggestion.date)}`,
        occasion: suggestion.occasion || 'Gợi ý hôm nay',
        description: suggestion.reason || 'Outfit được Shelfy gợi ý từ tủ đồ cá nhân.',
        itemIds,
        wornDate: suggestion.date || localDateValue(),
        weatherSnapshotId: suggestion.weatherSnapshotId || context?.weather?.id,
        calendarEventId: suggestion.calendarEventId || context?.events?.[0]?.id,
      });
      const confirmed = await suggestionApi.markConfirmed(suggestion.id, {
        dailyOutfitId: result?.id,
      });
      setLatest((current) => ({
        ...(current || {}),
        generated: true,
        suggestion: {
          ...suggestion,
          ...confirmed,
          items: confirmed?.items?.length ? confirmed.items : suggestion.items,
          context,
        },
      }));
      setToast('Đã xác nhận outfit sẽ mặc hôm nay.');
    } catch (err) {
      setError(err.message || 'Không xác nhận được outfit hôm nay');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleNotify = () => {
    window.alert(topNavData.notificationMessage);
  };

  return (
    <>
      <Sidebar activeKey="suggestions" data={sidebarData} />
      <TopNav data={nav} onNotify={handleNotify} />
      <StatusToast message={toast} onClose={() => setToast('')} />

      <main className="ml-64 min-h-screen bg-surface-container-low px-10 pb-12 pt-24">
        <div className="mx-auto grid max-w-[1360px] gap-6">
          <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-secondary">Gợi ý hôm nay</p>
              <h1 className="mt-2 text-4xl font-extrabold leading-tight text-primary">
                Stylist tự động chọn outfit theo ngày của bạn
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-on-surface-variant">
                Dữ liệu lấy từ tủ đồ, thời tiết đã lưu và Google Calendar đã đồng bộ trong Nodejs service, không cần gọi AI provider.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-subtle bg-white px-5 py-3 text-sm font-bold text-primary transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
                onClick={loadLatest}
                type="button"
              >
                <MaterialIcon name="sync" size={18} />
                Tải lại
              </button>
              <a
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary/90"
                href="#/wear-history"
              >
                <MaterialIcon name="history" size={18} />
                Lịch sử mặc
              </a>
            </div>
          </section>

          {notice && (
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700" role="alert">
              {notice}
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600" role="alert">
              {error}
            </div>
          )}

          {isLoading ? (
            <SuggestSkeleton />
          ) : (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              {suggestion ? (
                <SuggestionPanel
                  isConfirming={isConfirming}
                  isGenerating={isGenerating}
                  onConfirm={handleConfirm}
                  onGenerate={handleGenerate}
                  suggestion={suggestion}
                />
              ) : (
                <EmptySuggestion
                  context={context}
                  isGenerating={isGenerating}
                  onGenerate={handleGenerate}
                />
              )}
              <ContextPanel context={context} />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
