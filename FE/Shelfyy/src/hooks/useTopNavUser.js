import { useEffect, useState } from 'react';
import { userApi } from '../api/userApi';
import { toTopNav } from '../api/adapters';
import { topNavData as defaultTopNavData } from '../const/homeData';

/**
 * Lấy thông tin user đang đăng nhập (tên, gói membership) để hiển thị lên
 * TopNav. Trước đây các trang Wardrobe/Suggest/Trial/Premium dùng thẳng
 * `topNavData` tĩnh (tên hardcode "Duong Minh Kiet") thay vì gọi API thật
 * như HomePage đang làm — khiến tên hiển thị sai với user vừa đăng ký/đăng
 * nhập. Hook này gọi userApi.me() một lần và map qua toTopNav(), fallback về
 * dữ liệu tĩnh nếu chưa tải xong hoặc lỗi.
 */
export function useTopNavUser() {
  const [nav, setNav] = useState(defaultTopNavData);

  useEffect(() => {
    let ignore = false;
    userApi
      .me()
      .then((profile) => {
        if (!ignore) setNav(toTopNav(profile));
      })
      .catch(() => {
        // Giữ nguyên dữ liệu mặc định nếu chưa đăng nhập / lỗi mạng.
      });
    return () => {
      ignore = true;
    };
  }, []);

  return nav;
}
