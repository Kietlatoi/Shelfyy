export const studioItems = [
  { id: 'tee', name: 'Áo thun trắng', category: 'Áo', image: 'tee.webp' },
  { id: 'jeans', name: 'Quần jeans xanh', category: 'Quần', image: 'jeans.webp' },
  { id: 'trousers', name: 'Quần dáng suông', category: 'Quần', image: 'trousers.webp' },
  { id: 'sneakers', name: 'Sneaker trắng', category: 'Giày', image: 'sneakers.webp' },
  { id: 'loafers', name: 'Loafer đen', category: 'Giày', image: 'loafers.webp' },
  { id: 'bag', name: 'Túi đeo vai', category: 'Phụ kiện', image: 'bag.webp' },
]

export const occasions = [
  { id: 'coffee', label: 'Đi cà phê', title: 'Một chút thảnh thơi.', bottom: 'jeans', shoes: 'sneakers', note: 'Áo trắng, denim xanh và sneaker. Nhẹ nhàng cho một cuộc hẹn không vội.' },
  { id: 'work', label: 'Đi làm', title: 'Gọn gàng, vẫn là bạn.', bottom: 'trousers', shoes: 'loafers', note: 'Đổi sang quần suông và loafer để bộ đồ quen có thêm nét chỉn chu.' },
  { id: 'weekend', label: 'Cuối tuần', title: 'Cứ thoải mái thôi.', bottom: 'trousers', shoes: 'sneakers', note: 'Phom rộng và một đôi giày êm. Sẵn sàng cho những kế hoạch ngẫu hứng.' },
]

export const appScreens = [
  { id: 'home', label: 'Trang chủ', image: 'app-home.webp', alt: 'Ảnh chụp thật: trang chủ Shelfy với thời tiết và outfit hôm nay' },
  { id: 'wardrobe', label: 'Tủ đồ', image: 'app-wardrobe.webp', alt: 'Ảnh chụp thật: danh mục tủ đồ trong ứng dụng Shelfy' },
  { id: 'suggest', label: 'Gợi ý', image: 'app-suggest.webp', alt: 'Ảnh chụp thật: gợi ý trang phục trong ứng dụng Shelfy' },
  { id: 'tryon', label: 'Thử đồ', image: 'app-tryon.webp', alt: 'Ảnh chụp thật: màn hình chọn ảnh người và trang phục để thử đồ AI' },
]

export const defaultDownloadUrl = 'https://apkpure.com/p/com.duongminhkiet.shelfy'

export function safeDownloadUrl(value) {
  try {
    const url = new URL(value?.trim() || defaultDownloadUrl)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch { return null }
}
