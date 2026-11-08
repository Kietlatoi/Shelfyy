import { useState } from 'react'
import { appScreens, occasions, studioItems } from '../const/studioData'

function ItemImage({ id, ...props }) {
  const item = studioItems.find((entry) => entry.id === id)
  return <img src={`/studio/${item.image}`} alt={item.name} width="240" height="280" {...props} />
}

export function StudioPhone({ occasion, setOccasion, bottom, setBottom, shoes, setShoes, hasBag, setHasBag, saved, setSaved }) {
  const [mode, setMode] = useState('demo')
  const [tab, setTab] = useState('home')
  const [filter, setFilter] = useState('Tất cả')
  const [screen, setScreen] = useState(appScreens[0])
  const look = occasions.find((item) => item.id === occasion)
  const items = studioItems.filter((item) => (hasBag || item.id !== 'bag') && (filter === 'Tất cả' || item.category === filter))
  const chooseItem = (item) => {
    if (item.category === 'Quần') setBottom(item.id)
    if (item.category === 'Giày') setShoes(item.id)
    setSaved(false)
    setTab('outfit')
  }

  return <div className="studio-phone-area">
    <div className="studio-mode" aria-label="Chế độ điện thoại">
      <button type="button" aria-pressed={mode === 'demo'} onClick={() => setMode('demo')}>Dùng thử</button>
      <button type="button" aria-pressed={mode === 'screens'} onClick={() => setMode('screens')}>Ảnh app thật</button>
    </div>
    <div className="studio-phone" aria-label={mode === 'demo' ? 'Điện thoại demo Shelfy' : 'Điện thoại xem ảnh app Shelfy'}>
      <div className="studio-phone-camera" aria-hidden="true" />
      {mode === 'screens' ? <div className="studio-real-screen"><img src={`/studio/${screen.image}`} alt={screen.alt} width="432" height="960" /><span>Ảnh chụp ứng dụng</span></div> : <>
        <div className="studio-phone-status" aria-hidden="true"><span>9:41</span><span>▮▮▮ &nbsp; ▰</span></div>
        <div className="studio-phone-content">
          <div className="studio-app-heading"><span className="studio-app-icon" aria-hidden="true">s.</span><strong>Shelfy<span>Tủ đồ của riêng bạn</span></strong><span className="studio-demo-tag">DEMO</span></div>
          {tab === 'home' && <>
            <h3>Chào ngày mới.<br />Hôm nay mặc gì?</h3>
            <div className="studio-weather"><span><small>THỜI TIẾT MẪU</small><strong>26°</strong><span>Một ngày dễ chịu</span></span><span className="studio-sun" aria-hidden="true">☀</span></div>
            <div className="studio-app-section"><strong>Outfit dành cho hôm nay</strong><span>{look.label}</span></div>
            <button type="button" className="studio-phone-look" onClick={() => setTab('outfit')} aria-label="Mở bộ phối hiện tại"><ItemImage id="tee" /><ItemImage id={bottom} /><ItemImage id={shoes} /></button>
            <p className="studio-app-note">Một bộ đồ quen. Một cách nhìn mới.</p>
            <button type="button" className="studio-app-primary" onClick={() => setTab('outfit')}>Phối theo gu của bạn <span aria-hidden="true">↗</span></button>
            <button type="button" className="studio-app-link" onClick={() => setTab('wardrobe')}>Khám phá tủ đồ mẫu →</button>
          </>}
          {tab === 'wardrobe' && <>
            <div className="studio-closet-title"><h3>Tủ đồ của bạn</h3><span>{hasBag ? 6 : 5} món mẫu</span></div>
            <div className="studio-app-filters" aria-label="Lọc tủ đồ mẫu">{['Tất cả', 'Áo', 'Quần', 'Giày', 'Phụ kiện'].map((label) => <button type="button" key={label} aria-pressed={filter === label} onClick={() => setFilter(label)}>{label}</button>)}</div>
            <div className="studio-closet-grid">{items.map((item) => <button type="button" key={item.id} onClick={() => chooseItem(item)} aria-label={`Phối ${item.name}`}><ItemImage id={item.id} /><span>{item.name}</span></button>)}{items.length === 0 && <p className="studio-empty">Chưa có phụ kiện. Thêm chiếc túi mẫu bên dưới nhé.</p>}</div>
            <button type="button" className="studio-app-primary" onClick={() => { setHasBag(!hasBag); setSaved(false) }}>{hasBag ? '− Bỏ túi mẫu' : '+ Thêm một chiếc túi mẫu'}</button>
          </>}
          {tab === 'outfit' && <>
            <h3>Mặc theo cách<br />của bạn.</h3>
            <div className="studio-occasion" aria-label="Chọn dịp mặc trong demo">{occasions.map((item) => <button type="button" key={item.id} aria-pressed={occasion === item.id} onClick={() => setOccasion(item.id)}>{item.label}</button>)}</div>
            <div className="studio-phone-look studio-phone-look--edit"><ItemImage id="tee" /><ItemImage id={bottom} /><ItemImage id={shoes} />{hasBag && <ItemImage id="bag" className="studio-phone-bag" />}</div>
            <div className="studio-swap-row"><button type="button" onClick={() => { setBottom(bottom === 'jeans' ? 'trousers' : 'jeans'); setSaved(false) }}>↻ Đổi quần</button><button type="button" onClick={() => { setShoes(shoes === 'sneakers' ? 'loafers' : 'sneakers'); setSaved(false) }}>↻ Đổi giày</button></div>
            <button type="button" className="studio-app-primary" aria-pressed={saved} onClick={() => setSaved(!saved)}>{saved ? '✓ Đã giữ bộ phối cho lần xem này' : '♡ Giữ bộ phối này'}</button>
            <p className="studio-app-note" role="status">{saved ? 'Bộ phối của bạn đang ở cuối trang.' : 'Bấm đổi món để tìm cách phối bạn thích.'}</p>
          </>}
        </div>
        <nav className="studio-app-nav" aria-label="Điều hướng ứng dụng mẫu">{[{ id: 'home', icon: '⌂', label: 'Trang chủ' }, { id: 'wardrobe', icon: '▦', label: 'Tủ đồ' }, { id: 'outfit', icon: '✳', label: 'Phối đồ' }].map((item) => <button type="button" key={item.id} aria-current={tab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}</nav>
      </>}
      <div className="studio-phone-homebar" aria-hidden="true" />
    </div>
    {mode === 'screens' && <div className="studio-screen-picker" aria-label="Chọn ảnh chụp ứng dụng">{appScreens.map((item) => <button type="button" key={item.id} aria-pressed={screen.id === item.id} onClick={() => setScreen(item)}>{item.label}</button>)}</div>}
    <p className="studio-phone-caption">{mode === 'demo' ? 'Dữ liệu mẫu · Không cần tài khoản · Không gọi AI thật' : 'Ảnh chụp từ ứng dụng Shelfy hiện tại'}</p>
  </div>
}
