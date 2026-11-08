// All models, specifications, and prices are fictional portfolio content.
export const products = [
  {
    id: 'studio-s', name: 'NOVA Studio S', series: 'STUDIO SERIES', category: 'desktop',
    uses: ['creator', 'work'], price: 179800, memory: 32, storage: 1024, badge: '注目モデル',
    image: 'assets/studio-s.svg', color: 'セージホワイト', cpu: 'N-Core 7 / 12コア', gpu: 'NC Graphics G60 / 8GB',
    description: '写真編集、動画制作、複数アプリでの作業に。32GBメモリと独立GPUを備えた、コンパクトなデスクトップ。',
    dimensions: '148 × 296 × 312 mm', weight: '6.8 kg', display: '別売', ports: 'USB-C × 2 / USB-A × 4 / HDMI × 1',
    memoryOptions: [32, 64], storageOptions: [1024, 2048], available: true, date: '2026-10-20'
  },
  {
    id: 'air-14', name: 'NOVA Air 14', series: 'AIR SERIES', category: 'laptop',
    uses: ['work', 'study'], price: 129800, memory: 16, storage: 512, badge: '軽量モデル',
    image: 'assets/laptop-air.svg', color: 'シルバー', cpu: 'N-Core 5 / 8コア', gpu: 'NC Iris / 内蔵',
    description: '持ち運びやすい1.24kgの14型ノート。資料作成やオンライン授業など、外出先での作業にも対応します。',
    dimensions: '312 × 218 × 15.8 mm', weight: '1.24 kg', display: '14型 / 2560 × 1600 / 60Hz', ports: 'USB-C × 2 / USB-A × 1 / HDMI × 1',
    memoryOptions: [16, 32], storageOptions: [512, 1024], available: true, date: '2026-10-10'
  },
  {
    id: 'core-x', name: 'NOVA Core X', series: 'CORE SERIES', category: 'desktop',
    uses: ['gaming', 'creator'], price: 249800, memory: 32, storage: 1024, badge: 'ハイパフォーマンス',
    image: 'assets/tower-x.svg', color: 'グラファイト', cpu: 'N-Core 9 / 16コア', gpu: 'NC Graphics G80 / 16GB',
    description: '3D制作やゲームに対応する独立GPU搭載モデル。拡張性のあるタワーケースと、大型ファンを採用しています。',
    dimensions: '220 × 440 × 460 mm', weight: '12.4 kg', display: '別売', ports: 'USB-C × 2 / USB-A × 6 / HDMI × 2',
    memoryOptions: [32, 64], storageOptions: [1024, 2048], available: true, date: '2026-09-20'
  },
  {
    id: 'mini-one', name: 'NOVA Mini One', series: 'MINI SERIES', category: 'mini',
    uses: ['work', 'study'], price: 89800, memory: 16, storage: 512, badge: '省スペース',
    image: 'assets/mini-one.svg', color: 'アルミニウム', cpu: 'N-Core 5 / 8コア', gpu: 'NC Iris / 内蔵',
    description: '幅128mmの小型PC。ブラウジング、表計算、動画視聴など、日常の作業を省スペースで行えます。',
    dimensions: '128 × 128 × 48 mm', weight: '0.62 kg', display: '別売', ports: 'USB-C × 2 / USB-A × 2 / HDMI × 2',
    memoryOptions: [16, 32], storageOptions: [512, 1024], available: true, date: '2026-09-01'
  },
  {
    id: 'pro-16', name: 'NOVA Pro 16', series: 'PRO SERIES', category: 'laptop',
    uses: ['creator', 'gaming', 'work'], price: 219800, memory: 32, storage: 1024, badge: '16型ディスプレイ',
    image: 'assets/laptop-pro.svg', color: 'グラファイト', cpu: 'N-Core 7 / 12コア', gpu: 'NC Graphics G50 / 8GB',
    description: '高解像度の16型ディスプレイと独立GPUを搭載。制作データを持ち運び、外出先でも編集作業を続けられます。',
    dimensions: '356 × 248 × 19.8 mm', weight: '1.89 kg', display: '16型 / 3200 × 2000 / 120Hz', ports: 'USB-C × 2 / USB-A × 2 / HDMI × 1',
    memoryOptions: [32, 64], storageOptions: [1024, 2048], available: true, date: '2026-10-01'
  },
  {
    id: 'studio-m', name: 'NOVA Studio M', series: 'STUDIO SERIES', category: 'desktop',
    uses: ['work', 'study'], price: 149800, memory: 16, storage: 1024, badge: '入荷待ち',
    image: 'assets/studio-s.svg', color: 'セージホワイト', cpu: 'N-Core 5 / 8コア', gpu: 'NC Iris / 内蔵',
    description: 'デスクワークや学習向けの標準構成。Studioシリーズのケースに、16GBメモリと1TB SSDを搭載しています。',
    dimensions: '148 × 296 × 312 mm', weight: '5.9 kg', display: '別売', ports: 'USB-C × 2 / USB-A × 4 / HDMI × 1',
    memoryOptions: [16, 32], storageOptions: [1024, 2048], available: false, date: '2026-08-10'
  }
];
export const categoryLabels = { all: 'すべて', desktop: 'デスクトップ', laptop: 'ノートPC', mini: 'ミニPC' };
export const useLabels = { work: '仕事・普段使い', creator: 'クリエイティブ', gaming: 'ゲーム', study: '学習' };
