export const TODAY_OUTFIT_SLOTS = [
  {
    key: "top",
    label: "Áo",
    hint: "Sơ mi, áo thun, blouse",
    icon: "checkroom",
  },
  {
    key: "outerwear",
    label: "Áo khoác",
    hint: "Blazer, jacket, cardigan",
    icon: "styler",
  },
  {
    key: "bottom",
    label: "Quần / Váy",
    hint: "Quần, chân váy, đầm",
    icon: "accessibility_new",
  },
  {
    key: "shoes",
    label: "Giày",
    hint: "Sneaker, loafer, boots",
    icon: "directions_walk",
  },
  {
    key: "accessory",
    label: "Phụ kiện",
    hint: "Túi, thắt lưng, trang sức",
    icon: "watch",
  },
];

export function createEmptyTodayOutfit() {
  return TODAY_OUTFIT_SLOTS.reduce((slots, slot) => ({ ...slots, [slot.key]: null }), {});
}
