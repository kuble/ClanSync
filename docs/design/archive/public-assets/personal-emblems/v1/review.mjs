import { awards, milestones, metals, monthColors, yearColors, awardColor, enamelFilter } from "./catalog.mjs";
let serial = 0;
const metalNames = { gold: "금 · 1위", silver: "은 · 2위", bronze: "동 · 3위" };
const awardDescription = (award, period, metal) => (period === "month" ? "월간 " : "연간 ") + award.category + " " + (metals.indexOf(metal) + 1) + "위";
function artwork(file, title, color) {
  const id = "enamel-" + serial++;
  return color
    ? '<svg class="art" viewBox="0 0 1254 1254" role="img" aria-label="' + title + '"><defs>' + enamelFilter(id, color) + '</defs><image href="' + file + '" width="1254" height="1254" filter="url(#' + id + ')"/></svg>'
    : '<img class="art" src="' + file + '" alt="' + title + '" width="1254" height="1254">';
}
function figure(file, title, subtitle, color) {
  return '<figure>' + artwork(file, title, color) + '<figcaption><strong>' + title + '</strong><span>' + subtitle + '</span><a href="' + file + '" download>투명 PNG 원본</a></figcaption></figure>';
}
function renderAwards(period, date, element) {
  const original = document.querySelector("#original").checked;
  const [colorName, hex] = awardColor(period, date);
  if (!element.children.length) element.innerHTML = metals.map((metal) => '<h3>' + metalNames[metal] + '</h3><div class="grid">' +
    awards.map((award) => figure("./awards/" + period + "/" + award.id + "-" + metal + ".png", awardDescription(award, period, metal),
      date + " · " + colorName, original ? null : hex)).join("") + '</div>').join("");
  element.querySelectorAll("figure").forEach((card, index) => {
    const award = awards[index % awards.length], metal = metals[Math.floor(index / awards.length)];
    const description = awardDescription(award, period, metal);
    card.querySelector(".art").outerHTML = artwork("./awards/" + period + "/" + award.id + "-" + metal + ".png", description, original ? null : hex);
    card.querySelector("figcaption strong").textContent = description;
    card.querySelector("figcaption span").textContent = date + " · " + colorName;
  });
}
function update() {
  const month = document.querySelector("#month"), year = document.querySelector("#year");
  if (!month.checkValidity() || !month.value || !year.checkValidity() || !year.value) return;
  renderAwards("month", month.value, document.querySelector("#monthly"));
  renderAwards("year", String(year.valueAsNumber).padStart(4, "0"), document.querySelector("#yearly"));
}
document.querySelector("#month").addEventListener("change", update);
document.querySelector("#year").addEventListener("change", update);
document.querySelector("#original").addEventListener("change", update);
document.querySelector("#theme").addEventListener("click", (event) => {
  const dark = document.body.classList.toggle("dark");
  event.target.textContent = dark ? "밝은 배경으로 보기" : "어두운 배경으로 보기";
});
document.querySelector("#milestones").innerHTML = milestones.map((series) => '<div class="growth">' +
  series.targets.map((value, index) => figure("./milestones/" + series.id + "-" + (index + 1) + ".png",
    (series.id === "prediction" ? "예측 " : "") + value + series.unit + " 달성", (index + 1) + "단계")).join("") + '</div>').join("");
document.querySelector("#month-colors").innerHTML = monthColors.map(([name, hex], index) =>
  figure("./awards/month/victory-gold.png", (index + 1) + "월 · " + name, "2026-" + String(index + 1).padStart(2, "0"), hex)).join("");
document.querySelector("#year-colors").innerHTML = yearColors.map(([name, hex], index) =>
  figure("./awards/year/victory-gold.png", (2026 + index) + "년 · " + name, "6년마다 순환 · 날짜 함께 표시", hex)).join("");
update();
