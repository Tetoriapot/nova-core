import { products } from '../data/products.js';

export const MAX_QUANTITY = 10;
export const MAX_COMPARE = 3;
export const STORAGE_KEY = 'nova-core-store-v1';
export const productById = id => products.find(product => product.id === id);
export const currency = value => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
export const capacity = value => value >= 1024 ? `${value / 1024}TB` : `${value}GB`;

export function configurationPrice(product, memory = product.memory, storage = product.storage) {
  if (!product.memoryOptions.includes(memory) || !product.storageOptions.includes(storage)) throw new RangeError('Invalid configuration');
  return product.price + (memory - product.memory) * 1000 + (storage - product.storage) * 20;
}

export function selectProducts({ query = '', category = 'all', use = 'all', budget = 0, sort = 'featured' } = {}) {
  const terms = query.normalize('NFKC').toLocaleLowerCase('ja').trim().split(/\s+/).filter(Boolean);
  const selected = products.filter(product => {
    const search = [product.name, product.series, product.cpu, product.gpu, product.description, product.color].join(' ').normalize('NFKC').toLocaleLowerCase('ja');
    return (category === 'all' || product.category === category) && (use === 'all' || product.uses.includes(use)) && (!budget || product.price <= budget) && terms.every(term => search.includes(term));
  });
  if (sort === 'price-asc') selected.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') selected.sort((a, b) => b.price - a.price);
  if (sort === 'newest') selected.sort((a, b) => b.date.localeCompare(a.date));
  return selected;
}

export const lineKey = line => `${line.productId}:${line.memory}:${line.storage}`;

export function addToCart(cart, productId, memory, storage) {
  const product = productById(productId);
  if (!product?.available) return { cart, error: 'この商品は入荷待ちです。ほかの商品をご確認ください。' };
  configurationPrice(product, memory, storage);
  const item = { productId, memory, storage, quantity: 1 };
  const existing = cart.find(line => lineKey(line) === lineKey(item));
  if (existing?.quantity >= MAX_QUANTITY) return { cart, error: '同じ構成は10台まで追加できます。カートで数量をご確認ください。' };
  return { cart: existing ? cart.map(line => line === existing ? { ...line, quantity: line.quantity + 1 } : line) : [...cart, item], error: null };
}

export function cartTotal(cart) {
  return cart.reduce((sum, line) => sum + configurationPrice(productById(line.productId), line.memory, line.storage) * line.quantity, 0);
}

export function toggleCompare(compare, id) {
  if (!productById(id)) return { compare, error: '商品が見つかりません。商品一覧から選び直してください。' };
  if (compare.includes(id)) return { compare: compare.filter(item => item !== id), error: null };
  if (compare.length >= MAX_COMPARE) return { compare, error: '比較できるのは3台までです。選択済みの商品を外してから追加してください。' };
  return { compare: [...compare, id], error: null };
}

// Preserve unrecognized fields when saving valid older documents. Invalid documents
// are never overwritten automatically, allowing the original data to be recovered.
export function readSavedState(raw) {
  if (raw === null) return { state: { version: 1, cart: [], compare: [] }, error: null };
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data) || (data.version !== undefined && data.version !== 1)) throw new Error('version');
    if (!Array.isArray(data.cart) || !Array.isArray(data.compare)) throw new Error('shape');
    const seen = new Set();
    for (const line of data.cart) {
      const product = productById(line?.productId);
      if (!product || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QUANTITY || seen.has(lineKey(line))) throw new Error('line');
      configurationPrice(product, line.memory, line.storage);
      seen.add(lineKey(line));
    }
    if (data.compare.length > MAX_COMPARE || new Set(data.compare).size !== data.compare.length || data.compare.some(id => !productById(id))) throw new Error('compare');
    return { state: { ...data, version: 1 }, error: null };
  } catch {
    return { state: { version: 1, cart: [], compare: [] }, error: '保存データを読み込めませんでした。元のデータを保護するため、この画面での変更は保存しません。別のブラウザでお試しください。' };
  }
}
