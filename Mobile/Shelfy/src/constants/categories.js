export const CATEGORIES = [
  { value: 'ALL', label: 'Tất cả', icon: 'apps' },
  { value: 'TOP', label: 'Áo', icon: 'checkroom' },
  { value: 'BOTTOM', label: 'Quần', icon: 'airline-seat-legroom-reduced' },
  { value: 'DRESS', label: 'Váy', icon: 'dry-cleaning' },
  { value: 'SHOES', label: 'Giày', icon: 'snowshoeing' },
  { value: 'BAG', label: 'Túi xách', icon: 'shopping-bag' },
  { value: 'ACCESSORY', label: 'Phụ kiện', icon: 'watch' },
  { value: 'OUTERWEAR', label: 'Áo khoác', icon: 'layers' },
  { value: 'OTHER', label: 'Khác', icon: 'category' },
];

export const CATEGORY_MAP = {
  TOP: { label: 'Áo', icon: 'checkroom', color: '#6366f1' },
  BOTTOM: { label: 'Quần', icon: 'airline-seat-legroom-reduced', color: '#3b82f6' },
  DRESS: { label: 'Váy', icon: 'dry-cleaning', color: '#ec4899' },
  SHOES: { label: 'Giày', icon: 'snowshoeing', color: '#10b981' },
  BAG: { label: 'Túi', icon: 'shopping-bag', color: '#f59e0b' },
  ACCESSORY: { label: 'Phụ kiện', icon: 'watch', color: '#8b5cf6' },
  OUTERWEAR: { label: 'Áo khoác', icon: 'layers', color: '#64748b' },
  OTHER: { label: 'Khác', icon: 'category', color: '#94a3b8' },
};

export const SEASONS = [
  'Bốn mùa',
  'Xuân',
  'Hạ',
  'Thu',
  'Đông',
  'Xuân - Hạ',
  'Thu - Đông',
];

export const SIZES = ['Free Size', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

export function getCategoryLabel(category) {
  return CATEGORY_MAP[category]?.label || category || 'Khác';
}

export function getCategoryIcon(category) {
  return CATEGORY_MAP[category]?.icon || 'category';
}
