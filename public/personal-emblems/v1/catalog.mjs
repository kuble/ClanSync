export const awards = [
  { id: "victory", name: "승리의 별", category: "승률" },
  { id: "participation", name: "약속의 태양", category: "참여율" },
  { id: "appearances", name: "전장의 기사", category: "출전 수" },
  { id: "streak", name: "불사조", category: "최장 연승" },
  { id: "prediction", name: "선견의 나침반", category: "예측 적중 수" },
];
export const milestones = [
  { id: "sessions", name: "동행의 길", targets: [10, 50, 100, 300], unit: "회 참여" },
  { id: "matches", name: "전장의 수호자", targets: [10, 50, 100, 500], unit: "경기 출전" },
  { id: "wins", name: "승리의 결정", targets: [10, 50, 100, 300], unit: "승" },
  { id: "streak", name: "꺼지지 않는 불씨", targets: [3, 5, 7, 10], unit: "연승" },
  { id: "prediction", name: "궤도의 관측자", targets: [10, 50, 100, 300], unit: "회 적중" },
];
export const metals = ["gold", "silver", "bronze"];
export const monthColors = [
  ["서리빛", "#5e9fcd"], ["자수정", "#9670c2"], ["새잎", "#368b64"],
  ["벚꽃", "#cc779c"], ["청록", "#389d94"], ["하늘", "#467fc1"],
  ["산호", "#cf696d"], ["귤빛", "#cd8843"], ["올리브", "#81934a"],
  ["호박", "#b87340"], ["남빛", "#6c70b3"], ["석류", "#ba576e"],
];
export const yearColors = [
  ["비취", "#368c70"], ["자수정", "#9266bb"], ["사파이어", "#4677c0"],
  ["루비", "#bd5365"], ["터키석", "#339f9b"], ["불씨", "#c58141"],
];
export function awardColor(period, date) {
  if (period === "month" && /^\d{4}-(0[1-9]|1[0-2])$/.test(date) && Number(date.slice(0, 4)) >= 1)
    return monthColors[Number(date.slice(5)) - 1];
  if (period === "year" && /^\d{4}$/.test(date) && Number(date) >= 1)
    return yearColors[((Number(date) - 2026) % 6 + 6) % 6];
  throw new RangeError("수상 기간과 날짜를 확인하세요.");
}

// Only jade enamel satisfies both channel comparisons; gold, copper, ivory and neutral silver remain untouched.
export function enamelWeight(r, g, b) {
  const clamp = (value) => Math.max(0, Math.min(1, value));
  return clamp(12 * (g - r) - .24) * clamp(12 * (g - b) - .24);
}
export function enamelFilter(id, hex) {
  if (!/^[a-z][a-z0-9-]*$/.test(id) || !/^#[0-9a-f]{6}$/i.test(hex)) throw new TypeError("잘못된 색상 또는 식별자");
  const rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const channel = (name, value) => '<feFunc' + name + ' type="table" tableValues="' + [value * .15, value * .55, value, value + (1 - value) * .55, 1].join(" ") + '"/>';
  return '<filter id="' + id + '" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">' +
    '<feColorMatrix in="SourceGraphic" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -12 12 0 0 -.24" result="green-r"/>' +
    '<feColorMatrix in="SourceGraphic" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 12 -12 0 -.24" result="green-b"/>' +
    '<feComposite in="green-r" in2="green-b" operator="arithmetic" k1="1" result="green"/>' +
    '<feComposite in="green" in2="SourceAlpha" operator="in" result="mask"/>' +
    '<feColorMatrix in="SourceGraphic" values="0 1 0 0 0  0 1 0 0 0  0 1 0 0 0  0 0 0 1 0" result="shade"/>' +
    '<feComponentTransfer in="shade" result="color">' + channel("R", rgb[0]) + channel("G", rgb[1]) + channel("B", rgb[2]) + '</feComponentTransfer>' +
    '<feComposite in="color" in2="mask" operator="in" result="tinted"/>' +
    '<feComposite in="SourceGraphic" in2="mask" operator="out" result="original"/>' +
    '<feComposite in="original" in2="tinted" operator="arithmetic" k2="1" k3="1"/></filter>';
}
