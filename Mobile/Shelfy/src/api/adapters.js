import { getCategoryLabel } from '../constants/categories';

export function pageContent(pageResponse) {
  if (!pageResponse) return [];
  if (Array.isArray(pageResponse)) return pageResponse;
  return pageResponse.content || pageResponse.items || [];
}

export function adaptClothingItem(item) {
  if (!item) return null;
  return {
    ...item,
    categoryLabel: getCategoryLabel(item.category),
    displayImage: item.imageUrl || item.thumbnailUrl || null,
    isFavorite: Boolean(item.favorite),
  };
}

export function adaptWeatherSnapshot(snapshot) {
  if (!snapshot) return null;
  return {
    location: snapshot.location || 'Vị trí hiện tại',
    temperature: Math.round(snapshot.temperature ?? 26),
    feelsLike: Math.round(snapshot.feelsLike ?? snapshot.temperature ?? 26),
    condition: snapshot.condition || 'Trời quang',
    humidity: snapshot.humidity ?? 70,
    windSpeed: snapshot.windSpeed ?? 5,
    cloudCover: snapshot.cloudCover ?? 20,
    isDay: snapshot.isDay ?? true,
  };
}
