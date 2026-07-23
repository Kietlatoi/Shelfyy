import { calendarData, outfitData, topNavData, weatherData } from '../const/homeData';
import { premiumPlans } from '../const/premiumData';
import { aiUploadData, wardrobeStorageData } from '../const/wardrobeData';
import { normalizeItemStatus } from '../const/wardrobeItemPreferences';

const fallbackImage = '/image/wardrobe-tee.png';

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString('vi-VN')}đ`;
}

function readableCategory(category = '') {
  const value = String(category).toUpperCase();
  if (['TOP', 'OUTERWEAR'].includes(value) || value.includes('ÁO')) return 'Áo';
  if (value === 'BOTTOM' || value.includes('QUẦN')) return 'Quần';
  if (value === 'DRESS' || value.includes('VÁY')) return 'Váy';
  return 'Phụ kiện';
}

export function toTopNav(user) {
  if (!user) return topNavData;
  return {
    ...topNavData,
    user: {
      name: user.fullName || user.email || topNavData.user.name,
      membership: user.plan ? `Gói ${user.plan}` : topNavData.user.membership,
    },
  };
}

export function toWeatherCard(weather) {
  if (!weather) return weatherData;
  return {
    ...weatherData,
    location: weather.location || weatherData.location,
    temperature: weather.temperature != null ? `${Math.round(weather.temperature)}°` : weatherData.temperature,
    condition: weather.condition || weatherData.condition,
    feelsLike: weather.feelsLike != null ? `Cảm giác như ${Math.round(weather.feelsLike)}°` : weatherData.feelsLike,
    icon: weather.icon || weatherData.icon,
    metrics: [
      { label: 'Độ ẩm', value: weather.humidity != null ? `${weather.humidity}%` : '-' },
      { label: 'Gió', value: weather.windSpeed != null ? `${weather.windSpeed} km/h` : '-', emphasis: true },
      { label: 'Mây', value: weather.cloudCover != null ? `${weather.cloudCover}%` : '-' },
    ],
  };
}

export function toOutfitSuggestion(data) {
  if (!data) return outfitData;
  return {
    ...outfitData,
    eyebrow: data.eyebrow || outfitData.eyebrow,
    title: data.title || outfitData.title,
    remaining: data.tryOnRemaining != null ? `Số lượt thử còn lại: ${data.tryOnRemaining}` : outfitData.remaining,
    image: data.imageUrl || outfitData.image,
    quote: data.quote || outfitData.quote,
    items: Array.isArray(data.items) && data.items.length ? data.items : outfitData.items,
  };
}

export function toWardrobeCard(item) {
  return {
    id: item.id,
    brand: item.brand || 'Khác',
    name: item.name || 'Trang phục',
    meta: `Size: ${item.size || '-'} | ${item.material || '-'}`,
    category: readableCategory(item.category),
    image: item.thumbnailUrl || item.imageUrl || item.backgroundRemovedUrl || fallbackImage,
    favorite: Boolean(item.favorite),
    itemStatus: normalizeItemStatus(item.itemStatus || item.status),
    raw: item,
  };
}

export function toAiUpload(item) {
  if (!item) return aiUploadData;
  return {
    image: item.thumbnailUrl || item.imageUrl || item.backgroundRemovedUrl || aiUploadData.image,
    status: 'Đồng bộ từ backend',
    results: [
      { label: 'Phân loại', icon: 'category', value: item.category || '-' },
      { label: 'Màu sắc', swatch: item.colorHex, value: item.color || '-' },
      { label: 'Mùa', icon: 'ac_unit', value: item.season || '-' },
      { label: 'Họa tiết', icon: 'texture', value: item.pattern || '-' },
    ],
  };
}

export function toStorage(stats) {
  if (!stats) return wardrobeStorageData;
  const limit = stats.storageLimit == null || stats.storageLimit < 0 ? 'không giới hạn' : `món đồ / ${stats.storageLimit}`;
  return {
    eyebrow: 'Bộ nhớ tủ đồ',
    used: String(stats.storageUsed ?? stats.totalItems ?? 0),
    limit,
    percent: stats.storagePercent ?? 0,
  };
}

export function toPremiumPlans(plans) {
  if (!Array.isArray(plans) || plans.length === 0) return premiumPlans;
  return plans.map((plan) => {
    const planName = String(plan.planName || plan.currentPlan || '').toUpperCase();
    const isFree = planName === 'FREE';
    const isPremium = planName === 'PREMIUM';
    const featured = planName === 'PRO';
    const period = plan.durationDays >= 365 || isPremium ? '/1 năm' : '/tháng';
    const tryOn = plan.features?.tryOnPerMonth || plan.features?.tryOnPerDay || plan.tryOnLimit || plan.tryOnLimitPerMonth;
    return {
      planType: planName,
      name: plan.displayName || plan.planName || 'Gói',
      tier: isFree ? 'Cơ bản' : isPremium ? 'Tiết kiệm năm' : 'Cá nhân',
      price: formatCurrency(plan.price),
      suffix: period,
      action: isFree ? 'Sử dụng ngay' : `Nâng cấp ${plan.displayName || planName}`,
      featured,
      badge: featured ? 'Phổ biến nhất' : undefined,
      features: [
        { label: isFree ? 'Thử đồ ảo: 5 lượt/ngày' : `Thử đồ ảo: ${tryOn || 100} lượt/tháng`, included: true, premium: !isFree },
        { label: isFree ? 'Lưu trữ tối đa 100 món đồ' : 'Lưu trữ tủ đồ không giới hạn', included: true, premium: !isFree },
      ],
    };
  });
}

export function toTrialOutfit(item, fallback) {
  if (!item) return fallback;
  return {
    ...fallback,
    image: item.thumbnailUrl || item.imageUrl || item.backgroundRemovedUrl || fallback.image,
    title: item.name || fallback.title,
    description: [item.brand, item.category, item.color].filter(Boolean).join(' • ') || fallback.description,
    itemId: item.id,
  };
}

export function toCalendarCard(data) {
  if (!data) return calendarData;

  const connected = Boolean(data.connected);
  const events = Array.isArray(data.events) ? data.events : [];
  return {
    ...calendarData,
    connected,
    providerEmail: data.email || '',
    calendarUrl: data.calendarUrl || calendarData.calendarUrl,
    statusTitle: data.status === 'GOOGLE_CALENDAR_RECONNECT_REQUIRED'
      ? 'Cần kết nối lại Google Calendar'
      : calendarData.statusTitle,
    statusDescription: data.status === 'GOOGLE_CALENDAR_RECONNECT_REQUIRED'
      ? 'Phiên Google Calendar đã hết hạn hoặc đã bị thu hồi quyền.'
      : calendarData.statusDescription,
    actionLabel: connected ? 'Mở Google Calendar' : 'Kết nối Google Calendar',
    events: events.map((event) => ({
      id: event.id,
      title: event.title || 'Không có tiêu đề',
      startTime: event.startTime,
      endTime: event.endTime,
      time: event.time,
      allDay: Boolean(event.allDay),
      location: event.location || '',
      description: event.description || '',
      htmlLink: event.htmlLink || '',
    })),
  };
}

export function toSuggestData(home, baseHero, baseCarousel, baseInsight) {
  if (!home) return { hero: baseHero, carousel: baseCarousel, insight: baseInsight };
  const weather = home.weather;
  const outfit = home.outfitSuggestion;
  const hero = {
    ...baseHero,
    weather: {
      ...baseHero.weather,
      location: weather?.temperature != null ? `${weather.location || 'Việt Nam'}, ${Math.round(weather.temperature)}°C` : baseHero.weather.location,
      condition: weather?.condition || baseHero.weather.condition,
    },
  };
  const carousel = outfit ? {
    ...baseCarousel,
    items: [
      {
        title: outfit.title || 'Outfit hôm nay',
        tags: (outfit.items || []).map((i) => i.category).filter(Boolean).slice(0, 2),
        metaIcon: 'thermostat',
        meta: weather?.condition || 'Phù hợp hôm nay',
        favorite: true,
        image: outfit.imageUrl || baseCarousel.items?.[0]?.image,
      },
      ...(baseCarousel.items || []).slice(1),
    ],
  } : baseCarousel;
  const insight = outfit?.quote ? { ...baseInsight, text: `"${outfit.quote}"` } : baseInsight;
  return { hero, carousel, insight };
}
