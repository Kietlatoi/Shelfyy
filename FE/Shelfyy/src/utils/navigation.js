/**
 * Điều hướng về trang gốc ("/") mà không để lại "#/" trên thanh địa chỉ.
 *
 * App.jsx dùng hash router (window.location.hash) để chuyển trang trong SPA.
 * Set `window.location.hash = '/'` sẽ luôn để lại URL dạng
 * "http://localhost:5173/#/" — không đẹp và gây khó hiểu vì trang gốc lẽ ra
 * chỉ cần "http://localhost:5173/".
 *
 * Thay vào đó, dùng history.replaceState để xoá hẳn phần hash khỏi URL, rồi
 * tự bắn sự kiện 'hashchange' để App.jsx (đang lắng nghe sự kiện này) cập
 * nhật lại route trong SPA mà không cần load lại trang.
 */
export function goToRootRoute() {
  const cleanUrl = window.location.pathname + window.location.search;
  window.history.replaceState(null, '', cleanUrl);
  window.dispatchEvent(new Event('hashchange'));
}
