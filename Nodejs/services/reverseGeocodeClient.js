var CACHE_TTL_MS = positiveNumber(
  process.env.REVERSE_GEOCODING_CACHE_TTL_MS,
  24 * 60 * 60 * 1000,
);
var MIN_INTERVAL_MS = positiveNumber(
  process.env.REVERSE_GEOCODING_MIN_INTERVAL_MS,
  1100,
);
var cache = new Map();
var nextAvailableAt = 0;
var requestQueue = Promise.resolve();
var VIETNAM_CITY_LABELS_BY_ISO = {
  "VN-SG": "Hồ Chí Minh",
  "VN-HN": "Hà Nội",
  "VN-DN": "Đà Nẵng",
  "VN-HP": "Hải Phòng",
  "VN-CT": "Cần Thơ",
};

function positiveNumber(value, fallback) {
  var number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function toFiniteNumber(value) {
  var number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function validateCoordinate(value, min, max) {
  var number = toFiniteNumber(value);
  return number != null && number >= min && number <= max;
}

function cacheKey(lat, lon) {
  return toFiniteNumber(lat).toFixed(3) + "," + toFiniteNumber(lon).toFixed(3);
}

function readCachedLabel(key) {
  var cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.createdAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return cached.label;
}

function writeCachedLabel(key, label) {
  if (!label) return;
  cache.set(key, {
    label: label,
    createdAt: Date.now(),
  });
}

function delay(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

async function throttleProviderCall() {
  var now = Date.now();
  var waitMs = Math.max(0, nextAvailableAt - now);
  nextAvailableAt = Math.max(now, nextAvailableAt) + MIN_INTERVAL_MS;
  if (waitMs > 0) {
    await delay(waitMs);
  }
}

function buildReverseGeocodeUrl(lat, lon) {
  var url = new URL(
    process.env.REVERSE_GEOCODING_API_URL ||
      "https://nominatim.openstreetmap.org/reverse",
  );
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set(
    "accept-language",
    process.env.REVERSE_GEOCODING_LANGUAGE || "vi,en",
  );
  url.searchParams.set("zoom", process.env.REVERSE_GEOCODING_ZOOM || "10");
  return url;
}

function normalizeLocationName(name) {
  if (!name || typeof name !== "string") return null;

  var normalized = name.trim().replace(/\s+/g, " ");
  if (!normalized) return null;

  var lower = normalized.toLocaleLowerCase("vi");
  if (
    lower === "thành phố hồ chí minh" ||
    lower === "ho chi minh city" ||
    lower === "hồ chí minh city" ||
    lower === "ho chi minh"
  ) {
    return "Hồ Chí Minh";
  }

  return normalized
    .replace(/^Thành phố\s+/i, "")
    .replace(/^Tỉnh\s+/i, "")
    .replace(/^City of\s+/i, "")
    .trim();
}

function extractLocationLabel(body) {
  if (!body || typeof body !== "object") return null;

  var address =
    body.address && typeof body.address === "object" ? body.address : {};
  var isoCode = address["ISO3166-2-lvl4"];
  if (typeof isoCode === "string" && VIETNAM_CITY_LABELS_BY_ISO[isoCode]) {
    return VIETNAM_CITY_LABELS_BY_ISO[isoCode];
  }

  if (typeof body.display_name === "string") {
    var displayName = body.display_name.toLocaleLowerCase("vi");
    if (
      displayName.indexOf("thành phố hồ chí minh") !== -1 ||
      displayName.indexOf("ho chi minh") !== -1
    ) {
      return "Hồ Chí Minh";
    }
  }

  var candidates = [
    address.city,
    address.town,
    address.municipality,
    address.state_district,
    address.county,
    address.state,
    body.name,
  ];

  for (var i = 0; i < candidates.length; i += 1) {
    var label = normalizeLocationName(candidates[i]);
    if (label) return label;
  }

  if (typeof body.display_name === "string") {
    return normalizeLocationName(body.display_name.split(",")[0]);
  }

  return null;
}

async function fetchReverseGeocode(lat, lon) {
  var controller = new AbortController();
  var timeout = setTimeout(
    function () {
      controller.abort();
    },
    positiveNumber(process.env.REVERSE_GEOCODING_TIMEOUT_MS, 5000),
  );

  try {
    await throttleProviderCall();

    var response = await fetch(buildReverseGeocodeUrl(lat, lon), {
      headers: {
        Accept: "application/json",
        "User-Agent":
          process.env.REVERSE_GEOCODING_USER_AGENT ||
          "ShelfyWeatherService/0.1 (local-dev)",
        Referer: process.env.APP_FRONTEND_URL || "http://localhost:5173",
      },
      signal: controller.signal,
    });

    if (!response.ok) return null;

    var body = await response.json();
    return extractLocationLabel(body);
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function reverseGeocode(lat, lon) {
  if (
    !validateCoordinate(lat, -90, 90) ||
    !validateCoordinate(lon, -180, 180)
  ) {
    return null;
  }

  var key = cacheKey(lat, lon);
  var cached = readCachedLabel(key);
  if (cached) return cached;

  requestQueue = requestQueue
    .catch(function () {
      return null;
    })
    .then(async function () {
      var existing = readCachedLabel(key);
      if (existing) return existing;

      var label = await fetchReverseGeocode(lat, lon);
      writeCachedLabel(key, label);
      return label;
    });

  return requestQueue;
}

module.exports = {
  reverseGeocode: reverseGeocode,
  extractLocationLabel: extractLocationLabel,
};
