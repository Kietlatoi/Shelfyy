var descriptions = {
  0: { text: 'Trời quang', icon: 'light_mode' },
  1: { text: 'Ít mây', icon: 'light_mode' },
  2: { text: 'Có mây rải rác', icon: 'partly_cloudy_day' },
  3: { text: 'Nhiều mây', icon: 'cloud' },
  45: { text: 'Sương mù', icon: 'foggy' },
  48: { text: 'Sương mù đóng băng', icon: 'foggy' },
  51: { text: 'Mưa phùn nhẹ', icon: 'rainy_light' },
  53: { text: 'Mưa phùn', icon: 'rainy_light' },
  55: { text: 'Mưa phùn dày', icon: 'rainy' },
  56: { text: 'Mưa phùn lạnh nhẹ', icon: 'weather_mix' },
  57: { text: 'Mưa phùn lạnh dày', icon: 'weather_mix' },
  61: { text: 'Mưa nhẹ', icon: 'rainy_light' },
  63: { text: 'Mưa vừa', icon: 'rainy' },
  65: { text: 'Mưa lớn', icon: 'rainy_heavy' },
  66: { text: 'Mưa lạnh nhẹ', icon: 'weather_mix' },
  67: { text: 'Mưa lạnh mạnh', icon: 'weather_mix' },
  71: { text: 'Tuyết nhẹ', icon: 'weather_snowy' },
  73: { text: 'Tuyết vừa', icon: 'weather_snowy' },
  75: { text: 'Tuyết dày', icon: 'weather_snowy' },
  77: { text: 'Hạt tuyết', icon: 'weather_snowy' },
  80: { text: 'Mưa rào nhẹ', icon: 'rainy_light' },
  81: { text: 'Mưa rào', icon: 'rainy' },
  82: { text: 'Mưa rào lớn', icon: 'rainy_heavy' },
  85: { text: 'Mưa tuyết nhẹ', icon: 'weather_snowy' },
  86: { text: 'Mưa tuyết mạnh', icon: 'weather_snowy' },
  95: { text: 'Dông', icon: 'thunderstorm' },
  96: { text: 'Dông kèm mưa đá nhẹ', icon: 'thunderstorm' },
  99: { text: 'Dông kèm mưa đá mạnh', icon: 'thunderstorm' },
};

function describeWeatherCode(code) {
  return descriptions[code] || { text: 'Không rõ điều kiện thời tiết', icon: 'device_unknown' };
}

module.exports = {
  describeWeatherCode: describeWeatherCode,
};
