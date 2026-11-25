// 스프라이트 검증(순수 함수, DOM 없음). 오류 문자열 배열을 돌려준다(빈 배열 = 통과).
export function validateSprite(px, pal, size) {
  const errs = [];
  if (px.length !== size.h) errs.push(`height ${px.length} != ${size.h}`);
  for (let y = 0; y < px.length; y++) {
    const row = px[y];
    if (row.length !== size.w) errs.push(`row ${y} length ${row.length} != ${size.w}`);
    for (const ch of row) {
      if (!(ch in pal)) errs.push(`row ${y} unknown key '${ch}'`);
    }
  }
  return errs;
}
