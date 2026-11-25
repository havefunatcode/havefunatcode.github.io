// 스프라이트 굽기(브라우저 전용 — document는 호출 시점에만 사용, import 시에는 건드리지 않는다).
export function bake(px, pal) {
  const h = px.length;
  const w = px[0].length;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const c = cv.getContext("2d");
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const col = pal[px[y][x]];
      if (col) {
        c.fillStyle = col;
        c.fillRect(x, y, 1, 1);
      }
    }
  }
  return cv;
}

const cache = new Map();
// 첫 호출 때 굽고 key로 캐시한다.
export function baked(key, px, pal) {
  let cv = cache.get(key);
  if (!cv) {
    cv = bake(px, pal);
    cache.set(key, cv);
  }
  return cv;
}
