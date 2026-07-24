import { MaterialIcon } from './MaterialIcon';

const fallbackImage = '/image/wardrobe-tee.png';

function imageForItem(item) {
  return item?.thumbnailUrl || item?.imageUrl || item?.backgroundRemovedUrl || fallbackImage;
}

function formatDate(value) {
  if (!value) return 'Hôm nay';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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

function categoryLabel(category) {
  const value = String(category || '').toUpperCase();
  if (value === 'TOP') return 'Áo';
  if (value === 'OUTERWEAR') return 'Áo khoác';
  if (value === 'BOTTOM') return 'Quần';
  if (value === 'DRESS') return 'Váy';
  if (value === 'SHOES') return 'Giày';
  if (value === 'BAG') return 'Túi';
  if (value === 'ACCESSORY') return 'Phụ kiện';
  return category || 'Món đồ';
}

function itemMeta(item) {
  return [item?.brand, item?.color].filter(Boolean).join(' · ') || categoryLabel(item?.category);
}

function PanelAction({ href, icon, label, primary = false }) {
  return (
    <a
      className={[
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-extrabold transition active:scale-[0.99]',
        primary
          ? 'bg-primary text-white hover:bg-secondary'
          : 'border border-border-subtle bg-white text-primary hover:border-secondary hover:text-secondary',
      ].join(' ')}
      href={href}
    >
      <MaterialIcon name={icon} size={18} />
      {label}
    </a>
  );
}

function OutfitSkeleton() {
  return (
    <div className="mt-6 grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" aria-busy="true">
      <div className="min-h-[420px] animate-pulse rounded-2xl bg-surface-container-low" />
      <div className="grid content-start gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="h-20 animate-pulse rounded-lg bg-surface-container-low" key={index} />
        ))}
      </div>
    </div>
  );
}

function EmptyTodayOutfit() {
  return (
    <div className="mt-6 flex flex-1 flex-col justify-between gap-8 rounded-2xl bg-surface-container-low p-6">
      <div>
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white text-secondary shadow-sm shadow-primary/5">
          <MaterialIcon name="checkroom" size={30} />
        </div>
        <h3 className="mt-6 text-3xl font-extrabold text-primary">
          Chưa có outfit được xác nhận
        </h3>
        <p className="mt-3 max-w-xl text-base font-semibold leading-7 text-on-surface-variant">
          Trang chủ sẽ hiển thị bộ đồ bạn chọn mặc hôm nay sau khi xác nhận trong tủ đồ hoặc từ trang gợi ý.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <PanelAction href="#/wardrobe" icon="add_task" label="Tự chọn trong tủ đồ" primary />
        <PanelAction href="#/suggest" icon="auto_awesome" label="Xem gợi ý hôm nay" />
      </div>
    </div>
  );
}

function ErrorTodayOutfit({ message }) {
  return (
    <div className="mt-6 flex flex-1 flex-col justify-between gap-8 rounded-2xl border border-red-100 bg-red-50 p-6">
      <div>
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white text-red-600">
          <MaterialIcon name="error" filled size={28} />
        </div>
        <h3 className="mt-5 text-2xl font-extrabold text-primary">Không tải được outfit hôm nay</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-red-700">{message}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <PanelAction href="#/wardrobe" icon="checkroom" label="Mở tủ đồ" primary />
        <PanelAction href="#/wear-history" icon="history" label="Xem lịch sử mặc" />
      </div>
    </div>
  );
}

function LatestTryOn({ latestTryOn }) {
  if (!latestTryOn?.resultImageUrl) return null;

  return (
    <div className="border-t border-border-subtle pt-4">
      <p className="text-[11px] font-extrabold uppercase tracking-widest text-secondary">Ảnh thử đã lưu</p>
      <div className="mt-3 grid grid-cols-[72px_1fr] gap-3">
        <img
          alt="Ảnh thử đồ đã lưu gần nhất"
          className="h-20 w-20 rounded-lg bg-surface-container object-cover"
          src={latestTryOn.resultImageUrl}
        />
        <div className="min-w-0 self-center">
          <p className="truncate text-sm font-extrabold text-primary">
            {latestTryOn.clothingItem?.name || 'Kết quả try-on gần nhất'}
          </p>
          <p className="mt-1 text-xs font-semibold text-on-surface-variant">
            {formatTime(latestTryOn.savedAt || latestTryOn.completedAt || latestTryOn.createdAt) || 'Đã lưu'}
          </p>
        </div>
      </div>
    </div>
  );
}

function ConfirmedTodayOutfit({ dailyOutfit, latestTryOn }) {
  const outfit = dailyOutfit?.outfit || {};
  const items = Array.isArray(outfit.items) ? outfit.items : [];
  const mainItem = items[0] || null;
  const confirmedTime = formatTime(dailyOutfit?.confirmedAt);
  const visibleItems = items.slice(0, 5);
  const weather = dailyOutfit?.weather;
  const calendarEvent = dailyOutfit?.calendarEvent;

  return (
    <div className="mt-6 grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="relative min-h-[420px] overflow-hidden rounded-2xl bg-surface-container-low">
        {mainItem ? (
          <img
            alt={mainItem.name || 'Món đồ chính trong outfit hôm nay'}
            className="h-full min-h-[420px] w-full object-cover"
            src={imageForItem(mainItem)}
          />
        ) : (
          <div className="flex h-full min-h-[420px] items-center justify-center text-on-surface-variant">
            <MaterialIcon name="image_not_supported" size={36} />
          </div>
        )}
        <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-white/90 p-4 shadow-lg shadow-primary/10 backdrop-blur">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-secondary">
            {outfit.source === 'AI_SUGGESTED' ? 'Từ gợi ý' : 'Bạn tự chọn'}
          </p>
          <h3 className="mt-1 text-xl font-extrabold text-primary">{outfit.name || 'Outfit hôm nay'}</h3>
          <p className="mt-1 text-sm font-semibold text-on-surface-variant">
            {confirmedTime ? `Đã xác nhận lúc ${confirmedTime}` : 'Đã xác nhận hôm nay'}
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-5">
        <div className="space-y-3">
          {visibleItems.map((item) => (
            <div className="grid grid-cols-[64px_1fr] gap-3 border-b border-border-subtle pb-3 last:border-b-0" key={item.id}>
              <img
                alt={item.name || 'Món đồ'}
                className="h-16 w-16 rounded-lg bg-surface-container object-cover"
                src={imageForItem(item)}
              />
              <div className="min-w-0 self-center">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
                  {categoryLabel(item.category)}
                </p>
                <p className="mt-1 truncate text-sm font-extrabold text-primary">{item.name || 'Món đồ'}</p>
                <p className="mt-0.5 truncate text-xs font-semibold text-on-surface-variant">{itemMeta(item)}</p>
              </div>
            </div>
          ))}
          {items.length > visibleItems.length && (
            <p className="text-xs font-bold text-on-surface-variant">
              +{items.length - visibleItems.length} món khác trong outfit
            </p>
          )}
        </div>

        <div className="grid gap-3 border-t border-border-subtle pt-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-on-surface-variant">Thời tiết</p>
            <p className="mt-1 text-sm font-extrabold text-primary">
              {weather
                ? `${weather.location || 'Vị trí hiện tại'} · ${weather.temperature != null ? `${Math.round(weather.temperature)}°` : '--'} · ${weather.condition || 'Không rõ'}`
                : 'Chưa gắn snapshot thời tiết'}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-on-surface-variant">Lịch trình</p>
            <p className="mt-1 truncate text-sm font-extrabold text-primary">
              {calendarEvent?.title || 'Chưa gắn sự kiện calendar'}
            </p>
          </div>
        </div>

        <LatestTryOn latestTryOn={latestTryOn} />

        <div className="mt-auto grid gap-3 pt-2">
          <PanelAction href="#/trial" icon="checkroom" label="Thử đồ với outfit này" primary />
          <PanelAction href="#/wear-history" icon="history" label="Xem lịch sử mặc" />
        </div>
      </div>
    </div>
  );
}

export function HomeTodayOutfitPanel({ dailyOutfit, error = '', isLoading = false, latestTryOn = null }) {
  const items = Array.isArray(dailyOutfit?.outfit?.items) ? dailyOutfit.outfit.items : [];
  const confirmed = Boolean(dailyOutfit?.confirmed && items.length);

  return (
    <section className="flex h-full min-h-[640px] flex-col rounded-[32px] border border-border-subtle bg-surface-container-lowest p-7 shadow-xl shadow-primary/5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-secondary">
            <MaterialIcon name="event_available" filled size={22} />
            <span className="text-label-md font-extrabold uppercase tracking-widest">Outfit hôm nay</span>
          </div>
          <h2 className="mt-3 max-w-xl text-4xl font-extrabold leading-tight text-primary">
            {confirmed ? 'Bộ đồ bạn đã chọn mặc hôm nay' : 'Hôm nay bạn mặc gì?'}
          </h2>
          <p className="mt-2 text-sm font-semibold text-on-surface-variant">
            {formatDate(dailyOutfit?.wornDate)}
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-surface-container-low px-4 py-2 text-sm font-extrabold text-on-surface-variant">
          <MaterialIcon name={confirmed ? 'task_alt' : 'radio_button_unchecked'} filled={confirmed} size={18} />
          {confirmed ? `${items.length} món đã xác nhận` : 'Chưa xác nhận'}
        </div>
      </header>

      {isLoading ? (
        <OutfitSkeleton />
      ) : error ? (
        <ErrorTodayOutfit message={error} />
      ) : confirmed ? (
        <ConfirmedTodayOutfit dailyOutfit={dailyOutfit} latestTryOn={latestTryOn} />
      ) : (
        <EmptyTodayOutfit />
      )}
    </section>
  );
}
