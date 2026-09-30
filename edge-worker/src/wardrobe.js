import { commitWrites, countCollection, setWrite } from './firestore-rest.js';
import { getEffectiveEntitlement } from './billing.js';

const CATEGORIES = new Set(['TOP', 'BOTTOM', 'DRESS', 'SHOES', 'BAG', 'ACCESSORY', 'OUTERWEAR', 'OTHER']);
const STATUSES = new Set(['IN_USE', 'RARELY_USED', 'STORED', 'TO_SELL']);

function invalid(message, code = 'INVALID_WARDROBE_ITEM') {
  const error = new Error(message);
  error.status = 400;
  error.code = code;
  return error;
}

function optionalString(value, max) {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || value.length > max) throw invalid('Thông tin món đồ không hợp lệ.');
  return value.trim();
}

function normalizeItem(uid, body, assertCloudinaryImage) {
  const name = String(body?.name || '').trim();
  const category = String(body?.category || '').toUpperCase();
  if (!name || name.length > 150) throw invalid('Tên món đồ phải có từ 1 đến 150 ký tự.');
  if (!CATEGORIES.has(category)) throw invalid('Phân loại trang phục không hợp lệ.');
  const status = String(body?.status || 'IN_USE');
  if (!STATUSES.has(status)) throw invalid('Trạng thái món đồ không hợp lệ.');
  if (body?.image) assertCloudinaryImage(uid, body.image, 'wardrobe');
  if (body?.thumbnail) assertCloudinaryImage(uid, body.thumbnail, 'wardrobe');
  const purchasePrice = body?.purchasePrice;
  if (purchasePrice !== null && purchasePrice !== undefined
    && (!Number.isFinite(Number(purchasePrice)) || Number(purchasePrice) < 0 || Number(purchasePrice) > 1_000_000_000)) {
    throw invalid('Giá mua không hợp lệ.');
  }
  const tags = Array.isArray(body?.tags)
    ? body.tags.slice(0, 25).map((tag) => String(tag).slice(0, 50))
    : [];
  const now = new Date().toISOString();
  return Object.fromEntries(Object.entries({
    name,
    brand: optionalString(body?.brand, 100),
    category,
    subCategory: optionalString(body?.subCategory, 100),
    color: optionalString(body?.color, 50),
    colorHex: optionalString(body?.colorHex, 20),
    season: optionalString(body?.season, 50),
    size: optionalString(body?.size, 30),
    pattern: optionalString(body?.pattern, 100),
    material: optionalString(body?.material, 100),
    tags,
    purchasePrice: purchasePrice === null || purchasePrice === undefined ? undefined : Number(purchasePrice),
    purchaseDate: optionalString(body?.purchaseDate, 32),
    sourceUrl: optionalString(body?.sourceUrl, 2048),
    image: body?.image || undefined,
    thumbnail: body?.thumbnail || undefined,
    backgroundRemovedUrl: optionalString(body?.backgroundRemovedUrl, 2048),
    favorite: body?.favorite === true,
    status,
    aiDetected: body?.aiDetected === true,
    wearCount: 0,
    lastWornAt: null,
    createdAt: now,
    updatedAt: now,
  }).filter(([, value]) => value !== undefined));
}

export async function createWardrobeItem(env, user, body, assertCloudinaryImage) {
  const [plan, itemCount] = await Promise.all([
    getEffectiveEntitlement(env, user.uid),
    countCollection(env, 'wardrobe', `users/${user.uid}`),
  ]);
  if (plan.wardrobeLimit >= 0 && itemCount >= plan.wardrobeLimit) {
    const error = new Error(`Gói ${plan.name} hỗ trợ tối đa ${plan.wardrobeLimit} món đồ.`);
    error.status = 403;
    error.code = 'WARDROBE_LIMIT_REACHED';
    throw error;
  }
  const id = crypto.randomUUID();
  const item = normalizeItem(user.uid, body, assertCloudinaryImage);
  await commitWrites(env, [
    setWrite(env, `users/${user.uid}/wardrobe/${id}`, item, { exists: false }),
  ]);
  return { id, ...item, imageUrl: item.image?.secureUrl || null, thumbnailUrl: item.thumbnail?.secureUrl || item.image?.secureUrl || null };
}
