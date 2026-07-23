export function getCurrentBrowserLocation() {
  if (!navigator.geolocation) {
    return Promise.reject(new Error('Trình duyệt không hỗ trợ lấy vị trí hiện tại.'));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error('Bạn chưa cấp quyền vị trí nên Shelfy chưa thể lấy thời tiết hiện tại.'));
          return;
        }

        if (error.code === error.TIMEOUT) {
          reject(new Error('Không lấy được vị trí hiện tại trong thời gian cho phép.'));
          return;
        }

        reject(new Error('Không lấy được vị trí hiện tại.'));
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    );
  });
}
