export const ITEM_STATUS_OPTIONS = [
  {
    value: 'IN_USE',
    label: 'Đang dùng',
    description: 'Món đồ vẫn dùng thường xuyên',
    icon: 'check-circle',
    color: '#10b981',
    bgColor: '#d1fae5',
  },
  {
    value: 'RARELY_USED',
    label: 'Ít mặc',
    description: 'Cần cân nhắc khi gợi ý outfit',
    icon: 'schedule',
    color: '#f59e0b',
    bgColor: '#fef3c7',
  },
  {
    value: 'STORED',
    label: 'Cất kho',
    description: 'Không ưu tiên mặc hằng ngày',
    icon: 'inventory-2',
    color: '#64748b',
    bgColor: '#f1f5f9',
  },
  {
    value: 'TO_SELL',
    label: 'Muốn thanh lý',
    description: 'Đồ dự kiến bán hoặc cho đi',
    icon: 'sell',
    color: '#ef4444',
    bgColor: '#fee2e2',
  },
];

export function normalizeItemStatus(value) {
  const raw = String(value || '').trim().toUpperCase();
  return ITEM_STATUS_OPTIONS.some((option) => option.value === raw) ? raw : 'IN_USE';
}

export function statusOptionFor(value) {
  const normalized = normalizeItemStatus(value);
  return ITEM_STATUS_OPTIONS.find((option) => option.value === normalized) || ITEM_STATUS_OPTIONS[0];
}
