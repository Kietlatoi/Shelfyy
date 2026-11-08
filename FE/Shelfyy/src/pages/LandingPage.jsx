import { useEffect, useRef, useState } from 'react'
import { AnalyticsConsent } from '../components/AnalyticsConsent'
import { StudioPhone } from '../components/StudioPhone'
import { trackDownload } from '../analytics'
import { occasions, safeDownloadUrl, studioItems } from '../const/studioData'
import './LandingPage.css'

const faqs = [
  ['Shelfy giúp tôi làm gì?', 'Shelfy giúp bạn quản lý tủ đồ, tìm gợi ý phối đồ và khám phá tính năng thử trang phục bằng AI. Bắt đầu từ những món đang có để tìm thêm những cách mặc hợp với mình.'],
  ['Tôi đang dùng app thật trong chiếc điện thoại này à?', 'Đây là bản demo tương tác với quần áo và thời tiết mẫu, chạy ngay trong trình duyệt. Bạn có thể lọc tủ đồ, đổi món và giữ một bộ phối trong lần xem này. Demo không đăng nhập, không lưu vào tài khoản và không gọi AI. Chọn “Ảnh app thật” để xem giao diện ứng dụng hiện tại.'],
  ['Shelfy đã có trên iPhone chưa?', 'Hiện trang này cung cấp liên kết tải bản Android. Chúng tôi sẽ cập nhật khi có thông tin phát hành cho nền tảng khác.'],
  ['Thử đồ AI có cho kết quả giống hoàn toàn ngoài đời không?', 'Ảnh thử đồ AI giúp bạn hình dung cách phối trang phục. Kết quả chỉ mang tính tham khảo, có thể khác về phom dáng, màu sắc và chi tiết; không thay thế việc thử đồ thực tế. Tính năng này được sử dụng trong app, không chạy trong demo website.'],
  ['Tôi có thể tìm thông tin về dữ liệu cá nhân ở đâu?', <>Bạn có thể đọc <a href="/privacy">chính sách quyền riêng tư</a> và <a href="/account-deletion">hướng dẫn xóa tài khoản</a>. Demo trên trang sử dụng dữ liệu mẫu, không yêu cầu ảnh cá nhân.</>],
]

function Arrow({ diagonal = false }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h15m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

export function LandingPage() {
  const rootRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [occasion, setOccasionState] = useState('coffee')
  const [bottom, setBottom] = useState('jeans')
  const [shoes, setShoes] = useState('sneakers')
  const [hasBag, setHasBag] = useState(false)
  const [saved, setSaved] = useState(false)
  const [demoReset, setDemoReset] = useState(0)
  const downloadUrl = safeDownloadUrl(import.meta.env.VITE_ANDROID_DOWNLOAD_URL)
  const downloadNote = downloadUrl && new URL(downloadUrl).hostname === 'apkpure.com'
    ? 'Bản Android · Tải qua APKPure'
    : 'Bản Android · Mở trang tải ứng dụng'
  const look = occasions.find((item) => item.id === occasion)
  const selectedItems = ['tee', bottom, shoes, ...(hasBag ? ['bag'] : [])].map((id) => studioItems.find((item) => item.id === id))
  const setOccasion = (id) => {
    const next = occasions.find((item) => item.id === id)
    setOccasionState(id)
    setBottom(next.bottom)
    setShoes(next.shoes)
    setSaved(false)
  }
  const resetDemo = () => { setOccasion('coffee'); setHasBag(false); setDemoReset((value) => value + 1) }

  useEffect(() => {
    let instance
    let disposed = false
    const script = document.createElement('script')
    script.src = '/vendor/scrollcraft.js'
    script.onload = () => {
      if (disposed || !rootRef.current) return
      instance = window.ScrollCraft.mount(rootRef.current)
      rootRef.current.classList.add('studio-motion-ready')
    }
    document.body.appendChild(script)
    return () => { disposed = true; instance?.destroy(); script.remove() }
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const close = (event) => { if (event.key === 'Escape') { setMenuOpen(false); document.getElementById('studio-menu-toggle')?.focus() } }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [menuOpen])

  const pointerDepth = (event) => {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const rect = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--px', `${((event.clientX - rect.left) / rect.width - 0.5) * 12}px`)
    event.currentTarget.style.setProperty('--py', `${((event.clientY - rect.top) / rect.height - 0.5) * 8}px`)
  }
  const download = (event) => {
    trackDownload(Boolean(downloadUrl))
    if (!downloadUrl) event.preventDefault()
  }

  return <div className="shelfy-studio" ref={rootRef}>
    <a className="studio-skip" href="#main">Bỏ qua điều hướng</a>
    <header className="studio-header">
      <a href="#" className="studio-wordmark" aria-label="Shelfy, về đầu trang">shelfy<span aria-hidden="true">✳</span></a>
      <nav id="studio-navigation" className={menuOpen ? 'studio-navigation is-open' : 'studio-navigation'} aria-label="Điều hướng chính"><a href="#a-familiar-morning" onClick={() => setMenuOpen(false)}>Khám phá</a><a href="#try-shelfy" onClick={() => setMenuOpen(false)}>Dùng thử</a><a href="#about-shelfy" onClick={() => setMenuOpen(false)}>Về Shelfy</a><a href="#questions" onClick={() => setMenuOpen(false)}>Hỏi đáp</a></nav>
      <a href="#download" className="studio-nav-download">Tải ứng dụng <Arrow diagonal /></a>
      <button id="studio-menu-toggle" type="button" className="studio-menu-toggle" aria-controls="studio-navigation" aria-expanded={menuOpen} aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? 'Đóng' : 'Menu'}<span aria-hidden="true">{menuOpen ? '×' : '+'}</span></button>
    </header>
    <main id="main">
      <section className="studio-hero" data-sc-act="flow" aria-labelledby="studio-title" onPointerMove={pointerDepth} onPointerLeave={(event) => { event.currentTarget.style.setProperty('--px', '0px'); event.currentTarget.style.setProperty('--py', '0px') }}>
        <div className="studio-hero-copy">
          <p className="studio-kicker"><span /> TỦ ĐỒ CỦA BẠN. THÊM KHẢ NĂNG MỚI.</p>
          <h1 id="studio-title">Tủ đồ quen.<br /><span>Phong cách</span><br />mới<span className="studio-title-dot">.</span></h1>
          <p className="studio-hero-description">Mặc khác đi, từ những món đang có.<br />Một tủ đồ số. Những gợi ý hợp gu. Và thêm nhiều cách để là chính mình.</p>
          <div className="studio-hero-actions"><a className="studio-button" href="#try-shelfy">Dùng thử Shelfy <Arrow diagonal /></a><a className="studio-text-link" href="#download">Tải cho Android <Arrow /></a></div>
          <div className="studio-hero-footnote"><span className="studio-mini-mark" aria-hidden="true">✳</span><span>Ít phân vân hơn.<br />Nhiều cảm hứng hơn.</span><span className="studio-hero-edition">YOUR EVERYDAY<br />WARDROBE, REIMAGINED.</span></div>
        </div>
        <div className="studio-hero-scene" aria-label="Bố cục cảm hứng thời trang, không phải kết quả AI">
          <span className="studio-scene-ring" aria-hidden="true" />
          <div className="studio-fashion-plane" data-sc-parallax="-0.07"><div className="studio-fashion-frame"><img src="/studio/editorial.jpg" alt="Cảm hứng phối áo sơ mi trắng, blazer đen và quần sáng màu" width="1100" height="1956" fetchPriority="high" /><span className="studio-photo-label">THE EVERYDAY EDIT</span></div></div>
          <div className="studio-floating-piece" data-sc-parallax="0.10"><div className="studio-garment-card"><span>TRONG TỦ ĐỒ CỦA BẠN</span><img src="/studio/tee.webp" alt="Áo thun trắng trong tủ đồ mẫu" width="320" height="320" /><div><strong>Một món quen.</strong><span>Nhiều cách mặc ↗</span></div></div></div>
          <div className="studio-look-note"><span aria-hidden="true">✳</span><p>Gu của bạn.<br /><strong>Để Shelfy gợi mở.</strong></p></div>
          <span className="studio-scene-caption">CẢM HỨNG THỜI TRANG / SHELFY STUDIO</span>
        </div>
      </section>

      <section id="a-familiar-morning" className="studio-persona" data-sc-act="flow" aria-labelledby="persona-title">
        <header className="studio-persona-heading">
          <div>
            <p className="studio-kicker">CÓ THẤY MÌNH TRONG CÂU CHUYỆN NÀY?</p>
            <h2 id="persona-title">7:45 sáng.<br />Câu hỏi cũ lại đến.</h2>
          </div>
          <p>Linh sắp đi làm. Tủ vẫn đầy những món từng rất thích. Nhưng đứng trước gương, cô lại nghĩ: <strong>“Hôm nay mặc gì?”</strong></p>
        </header>
        <div className="studio-persona-layout">
          <figure className="studio-persona-figure">
            <img src="/studio/morning-wardrobe.jpg" alt="Áo trắng và đồ denim treo cạnh nhau, minh họa những món quen trong một tủ quần áo" width="1000" height="750" loading="lazy" />
            <div className="studio-persona-identity">
              <span className="studio-persona-avatar" aria-hidden="true">L.</span>
              <div><strong>Linh, 25 tuổi</strong><span>Nhân viên văn phòng. Thích mặc đẹp theo gu riêng.</span></div>
              <span className="studio-persona-label">PERSONA MINH HỌA</span>
            </div>
            <blockquote>“Mình muốn mặc khác một chút.<br />Nhưng chẳng biết bắt đầu từ món nào.”</blockquote>
            <figcaption>Nhân vật và tình huống được xây dựng để minh họa, không phải lời chứng thực của khách hàng. <a href="https://unsplash.com/photos/clothes-hang-on-a-rack-against-a-white-wall-klMSx8K9SVc" target="_blank" rel="noreferrer">Ảnh: Kamil Kalkan / Unsplash ↗</a></figcaption>
          </figure>
          <ol className="studio-persona-timeline">
            <li data-sc-in><span className="studio-persona-time">07:45 <span>TRƯỚC GƯƠNG</span></span><h3>Thử rồi, lại thay.</h3><p>Chiếc áo thích thì chưa biết phối cùng gì. Bộ dễ mặc nhất lại vừa mặc hôm qua. Linh đổi thêm một lần nữa.</p></li>
            <li data-sc-in><span className="studio-persona-time">08:00 <span>ĐẾN GIỜ ĐI LÀM</span></span><h3>Cuối cùng, vẫn bộ quen.</h3><p>Cô chọn cho kịp giờ. Vẫn gọn gàng, nhưng cảm hứng muốn thử một phong cách khác lại để dành cho hôm sau.</p></li>
            <li data-sc-in><span className="studio-persona-time">21:30 <span>LƯỚT ĐIỆN THOẠI</span></span><h3>Hay là mua thêm một món?</h3><p>Thấy một bộ phối đẹp, Linh muốn mua theo. Cô quên rằng một chiếc áo tương tự đang nằm sẵn trong tủ.</p></li>
          </ol>
        </div>
        <div className="studio-persona-bridge"><p>Thấy quen không?<br /><strong>Một cách phối mới có thể bắt đầu từ những món bạn đang có.</strong></p><a className="studio-text-link" href="#try-shelfy">Thử một cách phối khác <Arrow diagonal /></a></div>
      </section>

      <section id="discover" className="studio-discover" data-sc-act="flow" aria-labelledby="discover-title">
        <div className="studio-section-heading"><p className="studio-kicker">MỞ LẠI TỦ ĐỒ. MỞ THÊM Ý TƯỞNG.</p><h2 id="discover-title" data-sc-in>Bạn không thiếu quần áo.<br />Chỉ cần một góc nhìn mới.</h2><p>Chiếc áo từng rất thích. Đôi giày ít khi đi.<br />Shelfy giúp bạn nhìn lại, kết nối và mặc chúng theo cách khác.</p></div>
        <div className="studio-garment-strip" data-sc-stagger="70">{studioItems.slice(0, 5).map((item, index) => <div key={item.id} data-sc-in><span className="studio-item-index">{['COTTON', 'DENIM', 'EVERYDAY', 'GO ANYWHERE', 'TIMELESS'][index]}</span><img src={`/studio/${item.image}`} alt={item.name} width="260" height="300" loading="lazy" /><p>{item.name}</p></div>)}</div>
        <div className="studio-discover-bottom"><span>Món đồ vẫn vậy.</span><span>Cách phối thì không. <Arrow diagonal /></span></div>
      </section>

      <section id="try-shelfy" className="studio-demo-section" data-sc-act="flow" aria-labelledby="demo-title">
        <div className="studio-demo-copy"><p className="studio-kicker"><span /> PHÒNG THỬ PHONG CÁCH</p><h2 id="demo-title">Chạm thử.<br />Đổi một món.<br /><span>Thấy khác ngay.</span></h2><p>Chưa cần tải app. Bắt đầu bằng một tủ đồ nhỏ, chọn dịp mặc và tự tìm bộ phối hợp gu.</p><div className="studio-demo-directions"><p><span>↗</span> Mở <strong>Tủ đồ</strong> để lọc và thêm món mẫu.</p><p><span>↗</span> Vào <strong>Phối đồ</strong> để đổi quần, đổi giày.</p><p><span>↗</span> Giữ lại bộ phối bạn thích trong lần xem này.</p></div><div className="studio-occasion studio-occasion--outside" aria-label="Chọn dịp mặc">{occasions.map((item) => <button type="button" key={item.id} aria-pressed={occasion === item.id} onClick={() => setOccasion(item.id)}>{item.label}</button>)}</div><div className="studio-look-description" aria-live="polite"><h3>{look.title}</h3><p>{look.note}</p></div><button type="button" className="studio-reset" onClick={resetDemo}>↻ Bắt đầu lại với tủ đồ mẫu</button></div>
        <StudioPhone key={demoReset} {...{ occasion, setOccasion, bottom, setBottom, shoes, setShoes, hasBag, setHasBag, saved, setSaved }} />
        <span className="studio-demo-backdrop" aria-hidden="true">YOUR<br />STYLE.</span>
      </section>

      <section className="studio-app-story" data-sc-act="flow" aria-labelledby="app-story-title">
        <div className="studio-app-evidence" data-sc-reveal="up"><div className="studio-evidence-figure"><img src="/studio/app-tryon.webp" alt="Màn hình thử đồ AI thật của Shelfy, với hai bước chọn ảnh của bạn và chọn trang phục" width="432" height="960" loading="lazy" /></div><div className="studio-evidence-label"><span aria-hidden="true">↗</span><span>ĐÂY LÀ SHELFY.<br /><strong>Giao diện ứng dụng thật.</strong></span></div></div>
        <div className="studio-app-story-copy"><p className="studio-kicker">TỪ Ý TƯỞNG ĐẾN TRANG PHỤC</p><h2 id="app-story-title">Thêm cảm hứng.<br />Bớt những lần<br /><span>“không có gì mặc”.</span></h2><div className="studio-feature-line"><span aria-hidden="true">▦</span><div><h3>Mang tủ đồ theo bên mình</h3><p>Lưu ảnh và quản lý trang phục, để nhìn rõ những món bạn đang có.</p></div></div><div className="studio-feature-line"><span aria-hidden="true">✳</span><div><h3>Mở ra cách phối mới</h3><p>Khám phá gợi ý trang phục từ tủ đồ của bạn trong ứng dụng.</p></div></div><div className="studio-feature-line"><span aria-hidden="true">↗</span><div><h3>Hình dung với thử đồ AI</h3><p>Chọn ảnh của bạn và trang phục để khám phá cách mặc. Kết quả AI mang tính tham khảo.</p></div></div><a className="studio-text-link" href="#download">Khám phá trong ứng dụng <Arrow /></a></div>
      </section>

      <section id="about-shelfy" className="studio-about" data-sc-act="flow" aria-labelledby="about-title">
        <p className="studio-kicker">CÂU CHUYỆN CỦA CHÚNG TÔI</p>
        <div className="studio-about-layout">
          <div className="studio-about-intro">
            <h2 id="about-title">Chúng tôi<br />là Shelfy<span>.</span></h2>
            <p>Một ý tưởng nhỏ.<br />Cho những buổi sáng nhẹ tênh.</p>
            <span className="studio-about-flower" aria-hidden="true">✳</span>
          </div>
          <div className="studio-about-letter">
            <p className="studio-about-question">Nếu tủ đồ có thể lên tiếng,<br />nó sẽ gợi ý bạn mặc gì hôm nay?</p>
            <p>Shelfy bắt đầu từ câu hỏi giản dị ấy. Từ cảm giác đứng trước những món đồ quen mà vẫn muốn tìm một cách mặc khác, chúng tôi nghĩ đến một nơi giúp bạn nhìn lại tủ đồ bằng đôi mắt mới.</p>
            <p>Chúng tôi là những người làm nên Shelfy. Chúng tôi yêu việc tìm thấy một cách phối bất ngờ, cảm giác mặc đúng gu và sự tự tin khi được là chính mình.</p>
            <p>Vì thế, chúng tôi tạo ra một tủ đồ số để bạn lưu lại những món mình có, khám phá gợi ý và hình dung thêm những cách mặc. Công nghệ gợi mở những khả năng. Bạn là người chọn phong cách của mình.</p>
            <div className="studio-about-signature"><span className="studio-wordmark" aria-hidden="true">shelfy<span>✳</span></span><span>Tủ đồ quen.<br />Phong cách mới.</span></div>
          </div>
        </div>
        <div className="studio-about-beliefs" aria-label="Điều Shelfy hướng đến">
          <p><span aria-hidden="true">↗</span> Bắt đầu từ những gì bạn có.</p>
          <p><span aria-hidden="true">↗</span> Gợi mở, tôn trọng gu riêng.</p>
          <a href="mailto:minkiet.duong.dev@gmail.com">Viết cho chúng tôi <Arrow diagonal /></a>
        </div>
      </section>

      <section id="questions" className="studio-faq" aria-labelledby="faq-title"><div><p className="studio-kicker">TRƯỚC KHI BẮT ĐẦU</p><h2 id="faq-title">Bạn hỏi.<br />Shelfy trả lời.</h2><p>Một vài điều để bạn hiểu rõ hơn<br />về tủ đồ mới của mình.</p></div><div className="studio-faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><div>{answer}</div></details>)}</div></section>

      <section id="download" className="studio-download" aria-labelledby="download-title">
        <div className="studio-download-top">
          <span className="studio-kicker">BỘ PHỐI CỦA BẠN. CÂU CHUYỆN TIẾP THEO.</span>
          <span className="studio-download-status" aria-live="polite">{saved ? '♡ BỘ PHỐI BẠN ĐÃ GIỮ' : look.label.toLocaleUpperCase('vi')}</span>
        </div>
        <div className="studio-download-content">
          <div>
            <h2 id="download-title">Đến lượt<br /><span>tủ đồ của bạn.</span></h2>
            <p>Những món đồ bạn yêu thích.<br />Những cách mặc bạn chưa nghĩ tới.</p>
            <a className="studio-button studio-button--lime" href={downloadUrl || '#download-unavailable'} onClick={download}>Tải Shelfy cho Android<Arrow diagonal /></a>
            {downloadUrl ? <p className="studio-download-note">{downloadNote}</p> : <p id="download-unavailable" role="status">Liên kết tải đang được cập nhật. Vui lòng quay lại sau.</p>}
          </div>
          <div className="studio-chosen-look" aria-label="Bộ phối bạn đang chọn">
            {selectedItems.map((item) => <img key={item.id} src={`/studio/${item.image}`} alt={item.name} width="260" height="300" loading="lazy" />)}
            <span>{saved ? 'Đã giữ cho lần xem này' : 'Từ phòng thử của bạn'} <Arrow diagonal /></span>
          </div>
        </div>
        <div className="studio-download-bottom"><span>Phong cách không ở đâu xa.</span><span>Nó bắt đầu từ bạn. ✳</span></div>
      </section>
    </main>
    <footer className="studio-footer">
      <div className="studio-footer-main">
        <a href="#" className="studio-wordmark" aria-label="Shelfy, về đầu trang">shelfy<span aria-hidden="true">✳</span></a>
        <p>Tủ đồ quen. Phong cách mới.</p>
        <a href="#contact">Kết nối với Shelfy <Arrow diagonal /></a>
      </div>
      <div id="contact" className="studio-contact" aria-labelledby="contact-title">
        <h2 id="contact-title">Liên hệ với Shelfy</h2>
        <address>
          <div><span>Email</span><a href="mailto:minkiet.duong.dev@gmail.com">minkiet.duong.dev@gmail.com</a></div>
          <div><span>Điện thoại</span><a href="tel:0399554661">0399 554 661</a></div>
          <div><span>Facebook</span><a href="https://www.facebook.com/shelfy.fptu" target="_blank" rel="noopener noreferrer">Shelfy FPTU <Arrow diagonal /></a></div>
        </address>
      </div>
      <div className="studio-footer-bottom"><span>© {new Date().getFullYear()} Shelfy</span><div><a href="/privacy">Quyền riêng tư</a><a href="/account-deletion">Xóa tài khoản</a><a href="https://unsplash.com/photos/a-person-in-a-white-suit-4dC8ob5qrNE" target="_blank" rel="noreferrer">Ảnh: Peter Chirkov / Unsplash</a></div></div>
    </footer>
    <AnalyticsConsent />
  </div>
}
