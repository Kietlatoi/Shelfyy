export const ITEM_STATUS_OPTIONS = [
  {
    value: 'IN_USE',
    label: 'Đang dùng',
    description: 'Món đồ vẫn dùng thường xuyên',
    icon: 'check_circle',
    tone: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  },
  {
    value: 'RARELY_USED',
    label: 'Ít mặc',
    description: 'Cần cân nhắc khi gợi ý outfit',
    icon: 'schedule',
    tone: 'border-amber-100 bg-amber-50 text-amber-700',
  },
  {
    value: 'STORED',
    label: 'Cất kho',
    description: 'Không ưu tiên mặc hằng ngày',
    icon: 'inventory_2',
    tone: 'border-slate-200 bg-slate-50 text-slate-700',
  },
  {
    value: 'TO_SELL',
    label: 'Muốn thanh lý',
    description: 'Đồ dự kiến bán hoặc cho đi',
    icon: 'sell',
    tone: 'border-rose-100 bg-rose-50 text-rose-700',
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
