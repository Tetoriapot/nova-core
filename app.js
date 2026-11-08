import { products, categoryLabels, useLabels } from './data/products.js';
import { STORAGE_KEY, MAX_QUANTITY, currency, capacity, productById, configurationPrice, selectProducts, lineKey, addToCart, cartTotal, toggleCompare, readSavedState } from './lib/store.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const filters = { query: '', category: 'all', use: 'all', budget: 0, sort: 'featured' };
let savedState = { version: 1, cart: [], compare: [] };
let storageWritable = true;
let currentProduct = null;
let toastTimer;
let differencesOnly = false;
const dialogOrigins = new WeakMap();

function showStorageWarning(message) {
  $('#storage-warning').textContent = message;
  $('#storage-warning').hidden = false;
}

function loadState() {
  try {
    const result = readSavedState(localStorage.getItem(STORAGE_KEY));
    savedState = result.state;
    if (result.error) {
      storageWritable = false;
      showStorageWarning(result.error);
    }
  } catch {
    storageWritable = false;
    showStorageWarning('ブラウザ内に保存できません。この画面では操作できますが、閉じるとカートと比較リストは失われます。保存を許可したブラウザでお試しください。');
  }
}

function persist() {
  if (!storageWritable) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState)); }
  catch {
    storageWritable = false;
    showStorageWarning('変更を保存できませんでした。この画面では操作できますが、再読み込みすると保存前の内容に戻ります。ブラウザの空き容量や保存設定をご確認ください。');
  }
}

function toast(message) {
  clearTimeout(toastTimer);
  const element = $('#toast');
  const activeDialog = $('dialog[open]');
  (activeDialog || document.body).append(element);
  $('#toast-message').textContent = message;
  element.hidden = false;
  // This delay only dismisses a notification; it never coordinates application state.
  toastTimer = setTimeout(() => { element.hidden = true; }, 6000);
}

function closeDialog(dialog) {
  if (!dialog?.open) return;
  document.body.append($('#toast'));
  $('#toast').hidden = true;
  dialog.close();
}

function showDialog(dialog, fallback = $('.cart-trigger')) {
  const active = document.activeElement;
  const origin = active?.closest('dialog') ? fallback : active;
  $$('dialog[open]').forEach(closeDialog);
  dialogOrigins.set(dialog, origin);
  dialog.showModal();
}

function updateBadges() {
  const count = savedState.cart.reduce((sum, item) => sum + item.quantity, 0);
  $('#cart-count').textContent = count;
  $('.cart-trigger').setAttribute('aria-label', `カートを開く（${count}点）`);
  $('#compare-count').textContent = savedState.compare.length;
  $('.compare-header').setAttribute('aria-label', `比較リストを開く（${savedState.compare.length}台）`);
  $('#compare-tray').hidden = savedState.compare.length === 0;
  $('#tray-label').textContent = `${savedState.compare.length}台を選択中`;
  // Only locally authored, validated catalogue values enter HTML templates.
  $('#tray-items').innerHTML = savedState.compare.map(id => `<div class="tray-item"><span>${escapeHTML(productById(id).name)}</span><button class="icon-button" data-action="compare-toggle" data-id="${id}" aria-label="${escapeHTML(productById(id).name)}を比較から外す">×</button></div>`).join('');
  $$('[data-compare-id]').forEach(input => { input.checked = savedState.compare.includes(input.dataset.compareId); });
  const detailCompare = $('[data-action="detail-compare"]');
  if (detailCompare && currentProduct) detailCompare.textContent = savedState.compare.includes(currentProduct.id) ? '比較リストから外す' : '比較リストに追加';
}

function productCard(product, index) {
  const colorClass = product.color === 'グラファイト' ? 'graphite' : product.color === 'セージホワイト' ? '' : 'silver';
  return `<article class="product-card" data-product="${product.id}">
    <div class="product-art"><span class="badge ${product.available ? '' : 'sold-out'}">${escapeHTML(product.badge)}</span><button class="product-image-button" data-action="detail" data-id="${product.id}" aria-label="${escapeHTML(product.name)}の商品詳細を見る"><img src="${product.image}" alt="${escapeHTML(product.name)} ${escapeHTML(product.color)}" width="800" height="720" loading="lazy"></button><span class="art-index" aria-hidden="true">N/C — ${String(index + 1).padStart(2, '0')}</span></div>
    <div class="product-body"><p class="product-series">${product.series}</p><div class="product-title-row"><h3><button data-action="detail" data-id="${product.id}">${product.name}</button></h3><span class="product-color ${colorClass}" role="img" aria-label="本体色：${product.color}"></span></div><p class="product-description">${categoryLabels[product.category]} / ${product.uses.slice(0, 2).map(use => useLabels[use]).join('・')}</p><div class="product-specs"><span>${product.cpu.split(' / ')[0]}</span><span>${product.memory}GB メモリ</span><span>${capacity(product.storage)} SSD</span></div><div class="product-purchase"><p class="product-price"><strong>${currency(product.price)}</strong><small>税込</small></p><button class="detail-link" data-action="detail" data-id="${product.id}" aria-label="${product.name}の詳細を見る">詳細を見る<span aria-hidden="true">↗</span></button></div><div class="compare-control"><label><input type="checkbox" data-compare-id="${product.id}" ${savedState.compare.includes(product.id) ? 'checked' : ''} aria-label="${product.name}を比較する">比較する</label></div></div>
  </article>`;
}

function renderProducts() {
  const items = selectProducts(filters);
  $('#product-grid').innerHTML = items.length ? items.map(productCard).join('') : `<div class="empty-state"><div class="empty-symbol" aria-hidden="true">⌕</div><h3>条件に合う商品が見つかりません</h3><p>検索キーワードを短くするか、用途・価格の条件を変更してください。</p><button class="button button-dark" data-action="reset-filters">条件をクリアして全商品を見る<span aria-hidden="true">↗</span></button></div>`;
  $('#product-grid').setAttribute('aria-busy', 'false');
  $('#result-count').textContent = `${items.length}件 / 全${products.length}モデル`;
  $('#reset-filters').hidden = !filters.query && filters.category === 'all' && filters.use === 'all' && !filters.budget && filters.sort === 'featured';
  $$('[data-category]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === filters.category)));
}

function resetFilters() {
  Object.assign(filters, { query: '', category: 'all', use: 'all', budget: 0, sort: 'featured' });
  $('#filter-form').reset();
  renderProducts();
}

function openDetail(id) {
  const product = productById(id);
  if (!product) { toast('商品が見つかりません。商品一覧から選び直してください。'); return; }
  currentProduct = product;
  $('#detail-content').innerHTML = `<div class="detail-layout"><div class="detail-gallery"><span class="eyebrow">${product.series} / PRODUCT DETAIL</span><img src="${product.image}" alt="${product.name} ${product.color}" width="800" height="720"><p>${product.color} / オリジナル製品イメージ</p></div><div class="detail-copy"><p class="eyebrow">${categoryLabels[product.category]} / ${product.series}</p><h2 id="detail-title">${product.name}</h2><p class="detail-description">${product.description}</p><div class="detail-base-specs"><span>${product.cpu}</span><span>${product.gpu}</span></div><form class="detail-options" id="configuration-form"><fieldset><legend>メモリ</legend><div class="option-list">${product.memoryOptions.map(memory => `<label><input type="radio" name="memory" value="${memory}" ${memory === product.memory ? 'checked' : ''}><span>${memory}GB</span></label>`).join('')}</div></fieldset><fieldset><legend>SSDストレージ</legend><div class="option-list">${product.storageOptions.map(storage => `<label><input type="radio" name="storage" value="${storage}" ${storage === product.storage ? 'checked' : ''}><span>${capacity(storage)}</span></label>`).join('')}</div></fieldset></form><div class="detail-price-row"><p><strong id="configuration-price" aria-live="polite">${currency(product.price)}</strong><small>税込</small></p><span class="stock ${product.available ? '' : 'unavailable'}">${product.available ? 'カートに追加可能' : '入荷待ち'}</span></div><button class="button button-dark" data-action="add-cart" ${product.available ? '' : 'disabled'}>${product.available ? 'この構成をカートに追加' : '入荷待ちのため追加できません'}<span aria-hidden="true">＋</span></button><button class="text-button" data-action="detail-compare" data-id="${product.id}">${savedState.compare.includes(product.id) ? '比較リストから外す' : '比較リストに追加'}</button><p class="detail-note">架空商品のデモです。注文・決済は行いません。</p></div></div><section class="spec-section"><h3>基本仕様</h3><table class="spec-table"><tbody>${[['CPU', product.cpu], ['グラフィックス', product.gpu], ['メモリ', `${product.memoryOptions.join(' / ')}GBから選択`], ['ストレージ', `${product.storageOptions.map(capacity).join(' / ')} SSDから選択`], ['ディスプレイ', product.display], ['外形寸法', `${product.dimensions}（幅 × 奥行 × 高さ）`], ['質量', product.weight], ['接続端子', product.ports], ['同梱物', product.category === 'laptop' ? '本体、電源アダプター、電源ケーブル' : '本体、電源ケーブル（モニター・キーボードは付属しません）']].map(([label, value]) => `<tr><th scope="row">${label}</th><td>${escapeHTML(value)}</td></tr>`).join('')}</tbody></table></section>`;
  showDialog($('#detail-dialog'), $('.cart-trigger'));
}

function selectedConfiguration() {
  return { memory: Number($('#configuration-form input[name="memory"]:checked').value), storage: Number($('#configuration-form input[name="storage"]:checked').value) };
}

function changeCompare(id, source) {
  const result = toggleCompare(savedState.compare, id);
  if (result.error) {
    if (source?.matches('input')) source.checked = savedState.compare.includes(id);
    toast(result.error);
    return;
  }
  savedState.compare = result.compare;
  persist();
  updateBadges();
  if ($('#compare-dialog').open) {
    renderComparison();
    $('#compare-dialog [data-action="dialog-close"]').focus();
  }
}

function renderComparison() {
  const selected = savedState.compare.map(productById);
  if (selected.length === 0) {
    $('#compare-content').innerHTML = '<div class="empty-state"><div class="empty-symbol" aria-hidden="true">≋</div><h3>比較するPCを選んでください</h3><p>商品一覧の「比較する」を選ぶと、最大3台の仕様を並べられます。</p><button class="button button-dark" data-action="browse">商品一覧を見る<span aria-hidden="true">↗</span></button></div>';
    return;
  }
  const rows = [
    ['価格（税込）', p => currency(p.price)], ['種類', p => categoryLabels[p.category]], ['CPU', p => p.cpu], ['GPU', p => p.gpu], ['メモリ', p => `${p.memory}GB`], ['SSD', p => capacity(p.storage)], ['ディスプレイ', p => p.display], ['寸法', p => p.dimensions], ['質量', p => p.weight], ['接続端子', p => p.ports], ['販売状態', p => p.available ? 'カートに追加可能' : '入荷待ち']
  ];
  $('#compare-content').innerHTML = `<div class="compare-intro"><p>各モデルの標準構成を比較しています。${selected.length < 2 ? 'もう1台選ぶと違いを確認できます。' : '色の付いた行は仕様が異なります。'}</p><label><input id="differences-only" type="checkbox" ${differencesOnly && selected.length > 1 ? 'checked' : ''} ${selected.length < 2 ? 'disabled' : ''}>違いのある項目のみ</label></div><div class="comparison-scroll" tabindex="0" role="region" aria-label="製品比較表。狭い画面では左右にスクロールできます"><table class="comparison-table"><caption>標準構成の比較表。狭い画面では左右にスクロールできます。</caption><thead><tr><th scope="col"><span class="sr-only">仕様項目</span></th>${selected.map(p => `<th scope="col"><img src="${p.image}" alt="${p.name}" width="800" height="720"><h3>${p.name}</h3><button class="text-button" data-action="compare-toggle" data-id="${p.id}" aria-label="${p.name}を比較から外す">リストから外す</button><button class="button button-outline" data-action="detail" data-id="${p.id}">詳細・構成を見る</button></th>`).join('')}</tr></thead><tbody>${rows.map(([label, value], index) => {
    const different = new Set(selected.map(value)).size > 1;
    return `<tr class="${different ? 'different' : ''}" data-different="${different}" ${differencesOnly && selected.length > 1 && !different ? 'hidden' : ''}><th scope="row">${label}${different ? '<span class="sr-only">（相違あり）</span>' : ''}</th>${selected.map(p => `<td class="${index === 0 ? 'spec-price' : ''}">${escapeHTML(value(p))}</td>`).join('')}</tr>`;
  }).join('')}</tbody></table></div><p class="compare-footnote">商品名・スペック・価格は架空のサンプルです。構成の変更は商品詳細から行えます。</p>`;
}

function cartLine(line) {
  const product = productById(line.productId);
  const key = lineKey(line);
  return `<article class="cart-line" data-cart-key="${key}"><img src="${product.image}" alt="${product.name}" width="800" height="720"><div><h3><button data-action="detail" data-id="${product.id}">${product.name}</button></h3><p>${line.memory}GB メモリ / ${capacity(line.storage)} SSD</p><p>${product.color}</p><div class="cart-line-price">${currency(configurationPrice(product, line.memory, line.storage) * line.quantity)}<span class="sr-only">、${line.quantity}台分</span></div><div class="cart-line-controls"><div class="quantity-control" role="group" aria-label="${product.name} ${line.memory}GB ${capacity(line.storage)}の数量"><button data-action="quantity-minus" data-key="${key}" aria-label="${product.name}の数量を減らす" ${line.quantity <= 1 ? 'disabled' : ''}>−</button><output aria-label="数量">${line.quantity}</output><button data-action="quantity-plus" data-key="${key}" aria-label="${product.name}の数量を増やす" ${line.quantity >= MAX_QUANTITY ? 'disabled' : ''}>＋</button></div><button class="text-button" data-action="cart-remove" data-key="${key}" aria-label="${product.name} ${line.memory}GB ${capacity(line.storage)}をカートから削除">削除</button></div></div></article>`;
}

function renderCart() {
  const count = savedState.cart.reduce((sum, line) => sum + line.quantity, 0);
  $('#cart-dialog-count').textContent = `(${count})`;
  if (!count) {
    $('#cart-content').innerHTML = '<div class="empty-state"><div class="empty-symbol" aria-hidden="true">＋</div><h3>カートは空です</h3><p>商品詳細で構成を選び、カートに追加してください。</p><button class="button button-dark" data-action="browse">PCラインアップを見る<span aria-hidden="true">↗</span></button></div>';
    return;
  }
  const total = cartTotal(savedState.cart);
  $('#cart-content').innerHTML = `<div class="cart-items">${savedState.cart.map(cartLine).join('')}</div><div class="cart-summary"><div><span>商品小計（税込）</span><span>${currency(total)}</span></div><div><span>送料</span><span>対象外（デモのため配送なし）</span></div><div class="cart-total" aria-live="polite"><span>合計（税込）</span><strong>${currency(total)}</strong></div><button class="button button-dark" data-action="review-cart">構成・合計を確認する<span aria-hidden="true">→</span></button><p>本サイトは架空ブランドのデモです。実際の注文・決済・配送は行いません。</p><button class="text-button" data-action="browse">商品選びを続ける</button></div><section id="cart-review" class="cart-review" aria-labelledby="review-title" hidden><h3 id="review-title" tabindex="-1">選択内容を確認しました</h3><p>${savedState.cart.length}種類の構成、合計${count}台。<br>合計金額は${currency(total)}（税込）です。</p><p>これでカート操作の体験は終了です。注文は作成されません。${storageWritable ? '選択内容はこのブラウザに保存されています。' : '保存機能が使えないため、選択内容は保存されません。'}</p><button class="button button-outline" data-action="dialog-close">カートを閉じる<span aria-hidden="true">↗</span></button></section>`;
}

function changeQuantity(key, difference, source) {
  const item = savedState.cart.find(line => lineKey(line) === key);
  if (!item) return;
  const quantity = item.quantity + difference;
  if (quantity < 1 || quantity > MAX_QUANTITY) return;
  item.quantity = quantity;
  const action = source.dataset.action;
  persist(); updateBadges(); renderCart();
  const target = $$('[data-cart-key]').find(line => line.dataset.cartKey === key)?.querySelector(`[data-action="${action}"]`);
  if (target && !target.disabled) target.focus();
  else $$('[data-cart-key]').find(line => line.dataset.cartKey === key)?.querySelector('.quantity-control button:not(:disabled)')?.focus();
}

function browseProducts() {
  $$('dialog[open]').forEach(closeDialog);
  location.hash = 'products';
  $('#products-title').setAttribute('tabindex', '-1');
  $('#products-title').focus({ preventScroll: true });
  $('#products').scrollIntoView({ behavior: 'auto', block: 'start' });
}

function closeMenu() {
  $('#mobile-nav').hidden = true;
  $('.menu-toggle').setAttribute('aria-expanded', 'false');
  $('.menu-toggle').setAttribute('aria-label', 'メニューを開く');
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (button) {
    const { action, id, key } = button.dataset;
    switch (action) {
      case 'detail': openDetail(id); break;
      case 'dialog-close': closeDialog(button.closest('dialog')); break;
      case 'cart-open': renderCart(); showDialog($('#cart-dialog')); break;
      case 'compare-open': renderComparison(); showDialog($('#compare-dialog'), $('.compare-header')); break;
      case 'compare-toggle': changeCompare(id, button); break;
      case 'detail-compare': changeCompare(id, button); if (savedState.compare.includes(id)) toast(`${productById(id).name}を比較リストに追加しました。`); break;
      case 'compare-clear': savedState.compare = []; persist(); updateBadges(); $('.compare-header').focus(); break;
      case 'add-cart': {
        if (!currentProduct) break;
        const { memory, storage } = selectedConfiguration();
        const result = addToCart(savedState.cart, currentProduct.id, memory, storage);
        if (result.error) { toast(result.error); break; }
        savedState.cart = result.cart;
        persist(); updateBadges(); renderCart(); showDialog($('#cart-dialog'));
        toast(`${currentProduct.name}をカートに追加しました。`);
        break;
      }
      case 'quantity-minus': changeQuantity(key, -1, button); break;
      case 'quantity-plus': changeQuantity(key, 1, button); break;
      case 'cart-remove': {
        const removed = savedState.cart.find(line => lineKey(line) === key);
        savedState.cart = savedState.cart.filter(line => lineKey(line) !== key);
        persist(); updateBadges(); renderCart();
        $('#cart-dialog [data-action="dialog-close"]').focus();
        if (removed) toast(`${productById(removed.productId).name}をカートから削除しました。`);
        break;
      }
      case 'review-cart': $('#cart-review').hidden = false; $('#review-title').focus(); $('#cart-review').scrollIntoView({ block: 'nearest' }); break;
      case 'browse': browseProducts(); break;
      case 'reset-filters': resetFilters(); $('#search').focus({ preventScroll: true }); break;
      case 'filters': {
        const expanded = button.getAttribute('aria-expanded') !== 'true';
        button.setAttribute('aria-expanded', String(expanded));
        $('#filter-form').classList.toggle('is-expanded', expanded);
        break;
      }
      case 'search': closeMenu(); location.hash = 'products'; $('#search').focus(); break;
      case 'menu': {
        const expanded = button.getAttribute('aria-expanded') !== 'true';
        $('#mobile-nav').hidden = !expanded;
        button.setAttribute('aria-expanded', String(expanded));
        button.setAttribute('aria-label', expanded ? 'メニューを閉じる' : 'メニューを開く');
        break;
      }
      case 'privacy':
        $('#info-content').innerHTML = '<p class="eyebrow">LOCAL STORAGE / PRIVACY</p><h2 id="info-title">データの取り扱い</h2><p>カートの構成・数量と比較リストを、このブラウザのlocalStorageに保存します。氏名、住所、決済情報の入力は求めません。</p><p>保存内容をサーバーへ送信する処理はありません。ブラウザのサイトデータを削除すると、保存内容も消えます。検索条件は画面を再読み込みすると初期状態に戻ります。</p><p>このサイトはポートフォリオ用のデモです。実際の購入手続きや会員登録は行いません。</p><button class="button button-dark" data-action="dialog-close">閉じる<span aria-hidden="true">×</span></button>';
        showDialog($('#info-dialog')); break;
      case 'toast-close': $('#toast').hidden = true; break;
    }
  }
  const category = event.target.closest('[data-category]');
  if (category) { filters.category = category.dataset.category; renderProducts(); }
  const use = event.target.closest('[data-use]');
  if (use) {
    resetFilters(); filters.use = use.dataset.use; $('#use').value = filters.use;
    $('#filter-form').classList.add('is-expanded'); $('.filter-toggle').setAttribute('aria-expanded', 'true');
    renderProducts(); browseProducts();
  }
  if (event.target.closest('#mobile-nav a')) closeMenu();
});

document.addEventListener('change', event => {
  const target = event.target;
  if (target.matches('[data-compare-id]')) changeCompare(target.dataset.compareId, target);
  if (target.closest('#configuration-form') && currentProduct) {
    const { memory, storage } = selectedConfiguration();
    $('#configuration-price').textContent = currency(configurationPrice(currentProduct, memory, storage));
  }
  if (target.id === 'differences-only') {
    differencesOnly = target.checked;
    $$('.comparison-table tbody tr').forEach(row => { row.hidden = differencesOnly && row.dataset.different === 'false'; });
  }
});

$('#search').addEventListener('input', event => { filters.query = event.target.value; renderProducts(); });
for (const id of ['use', 'budget', 'sort']) {
  $(`#${id}`).addEventListener('change', event => { filters[id] = id === 'budget' ? Number(event.target.value) : event.target.value; renderProducts(); });
}
$('#filter-form').addEventListener('submit', event => event.preventDefault());
document.addEventListener('submit', event => { if (event.target.id === 'configuration-form') event.preventDefault(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('#mobile-nav').hidden) { closeMenu(); $('.menu-toggle').focus(); }
});
$$('dialog').forEach(dialog => {
  dialog.addEventListener('cancel', () => { document.body.append($('#toast')); $('#toast').hidden = true; });
  dialog.addEventListener('close', () => {
    const origin = dialogOrigins.get(dialog);
    // Do not move focus out of a newly opened dialog during modal-to-modal navigation.
    if (!$('dialog[open]') && origin?.isConnected && !origin.closest('dialog:not([open])')) origin.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(dialog);
  });
});
window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  loadState(); updateBadges(); renderProducts();
  if ($('#cart-dialog').open) renderCart();
  if ($('#compare-dialog').open) renderComparison();
});

try { loadState(); renderProducts(); updateBadges(); }
catch {
  $('#product-grid').setAttribute('aria-busy', 'false');
  $('#product-grid').innerHTML = '<div class="empty-state" role="alert"><h3>商品一覧を表示できませんでした</h3><p>ページを再読み込みしてください。解決しない場合は別のブラウザでお試しください。</p><a class="button button-dark" href="./">再読み込みする</a></div>';
  $('#result-count').textContent = '読み込みエラー';
}
