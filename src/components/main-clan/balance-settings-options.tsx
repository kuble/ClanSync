"use client";

import { useState } from "react";
import type { FormationSettings } from "@/lib/balance/formation";
import type { BanSettings } from "@/lib/balance/prematch";
import { BalanceDisplayPreview, BalanceBanPreview, type BanPreviewStage } from "./balance-settings-preview";
import styles from "./clan-balance-settings.module.css";

const field = "mt-2 min-h-11 w-full rounded-lg border bg-background px-3 text-sm";

function Toggle({ label, name = label, hint, checked, disabled, onChange }: {
  label: string; name?: string; hint?: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void;
}) {
  return <label className="flex items-center justify-between gap-4 py-2 text-sm">
    <span className="min-w-0"><span className="font-medium">{label}</span>{hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}</span>
    <input type="checkbox" aria-label={name} className="size-4 shrink-0 accent-primary disabled:opacity-40" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
  </label>;
}

export function BalanceDisplaySettings({ settings, onChange, locked, premium, regularRoom }: {
  settings: FormationSettings; onChange: (settings: FormationSettings) => void; locked: boolean; premium: boolean; regularRoom: boolean;
}) {
  return <div className="space-y-5">
    <div className={styles.preview}><BalanceDisplayPreview settings={settings} premium={premium} regularRoom={regularRoom} /></div>
    <p className="text-xs text-muted-foreground">편성 화면의 카드와 팀 비교에 적용됩니다.</p>
    <fieldset disabled={locked} className="rounded-xl border bg-muted/10 p-4">
      <legend className="px-1 text-sm font-semibold">닉네임 카드</legend>
      <Toggle label="점수" name="선수 카드 점수 표시" hint="카드 오른쪽의 평가·분석 점수" checked={settings.showPlayerCardScore} onChange={(checked) => onChange({ ...settings, showPlayerCardScore: checked })} />
      <Toggle label="닉네임 아래 정보" name="선수 카드 보조 정보 표시" checked={settings.showPlayerCardInfo} onChange={(checked) => onChange({ ...settings, showPlayerCardInfo: checked })} />
      {settings.showPlayerCardInfo ? <label className="mb-2 ml-3 block border-l pl-3 text-xs text-muted-foreground">표시 내용
        <select aria-label="선수 카드 보조 정보" className={field} value={settings.playerCardInfo} onChange={(event) => onChange({ ...settings, playerCardInfo: event.target.value as FormationSettings["playerCardInfo"] })}>
          <option value="record">세션 전적</option><option value="streak">현재 연승·연패</option>
        </select>
      </label> : null}
      <Toggle label="마우스 오버 상세 정보" name="플레이어 세션 정보 요약 표시" hint="전적·승률·점수·마이크 상태" checked={settings.showPlayerSessionSummary} onChange={(checked) => onChange({ ...settings, showPlayerSessionSummary: checked })} />
    </fieldset>
    <fieldset disabled={locked} className="rounded-xl border bg-muted/10 p-4">
      <legend className="px-1 text-sm font-semibold">팀 비교</legend>
      <label className="block text-sm font-medium">그래프 기준
        <select aria-label="팀 비교 그래프" className={field} value={premium && regularRoom ? settings.teamComparisonMode : "score"} onChange={(event) => onChange({ ...settings, teamComparisonMode: event.target.value as FormationSettings["teamComparisonMode"] })}>
          <option value="score">점수 합계</option><option value="prediction" disabled={!premium || !regularRoom}>예측 승률</option>
        </select>
      </label>
      {!premium || !regularRoom ? <p className="mt-2 text-xs text-muted-foreground">예측 승률은 Premium 정규 내전에서 표시합니다.</p> : null}
      <Toggle label="마우스 오버 비교 요약" name="팀 비교 요약 표시" checked={settings.showTeamComparisonSummary} onChange={(checked) => onChange({ ...settings, showTeamComparisonSummary: checked })} />
    </fieldset>
  </div>;
}

export function BalanceBanSettings({ gameSlug, map, hero, onMapChange, onHeroChange, settings, onChange, formation, onFormationChange, locked, premium, regularRoom }: {
  gameSlug: string; map: boolean; hero: boolean; onMapChange: (enabled: boolean) => void; onHeroChange: (enabled: boolean) => void;
  settings: BanSettings; onChange: (settings: BanSettings) => void; formation: FormationSettings; onFormationChange: (settings: FormationSettings) => void;
  locked: boolean; premium: boolean; regularRoom: boolean;
}) {
  const [stage, setStage] = useState<BanPreviewStage>(map ? "map" : hero ? "hero" : "match");
  return <div className="space-y-5">
    <div className={styles.preview}><BalanceBanPreview gameSlug={gameSlug} mapEnabled={map} heroEnabled={hero} settings={settings} stage={stage} onStageChange={setStage} predictionEnabled={premium && regularRoom && formation.predictionEnabled} predictionMinutes={formation.predictionMinutes} /></div>
    <fieldset disabled={locked} className="space-y-3">
      <legend className="sr-only">밴픽 설정</legend>
      <section className="rounded-xl border bg-muted/10 px-4 py-2" aria-label="맵 투표 설정">
        <Toggle label="맵 투표" name="맵 투표 사용" hint={map ? "후보 3개 중 득표로 맵 결정" : "편성에서 선택한 맵 사용"} checked={map} onChange={(checked) => { onMapChange(checked); setStage(checked ? "map" : hero ? "hero" : "match"); }} />
        {map ? <label className="mb-2 block border-t pt-3 text-xs">투표 시간(초)<input type="number" inputMode="numeric" aria-label="맵 투표 시간(초)" min={5} max={300} step={1} className={`${field} ${styles.numberInput}`} value={settings.mapBanSeconds} onFocus={() => setStage("map")} onChange={(event) => onChange({ ...settings, mapBanSeconds: Number(event.target.value) })} /></label> : null}
      </section>
      <section className="rounded-xl border bg-muted/10 px-4 py-2" aria-label="영웅 밴 설정">
        <Toggle label="영웅 밴" name="영웅 밴 사용" hint={hero ? "각 팀의 득표순으로 사용 금지" : "영웅 제한 없이 진행"} checked={hero} onChange={(checked) => { onHeroChange(checked); setStage(checked ? "hero" : map ? "map" : "match"); }} />
        {hero ? <div className="mb-2 grid grid-cols-2 gap-3 border-t pt-3" onFocusCapture={() => setStage("hero")}>
          <label className="block text-xs">팀별 밴 개수<select aria-label="팀별 영웅 밴 개수" className={field} value={settings.heroBansPerTeam} onChange={(event) => onChange({ ...settings, heroBansPerTeam: Number(event.target.value) as 1 | 2 })}><option value={1}>팀당 1영웅</option><option value={2}>팀당 2영웅</option></select></label>
          <label className="block text-xs">투표 시간(초)<input type="number" inputMode="numeric" aria-label="영웅 밴 시간(초)" min={5} max={300} step={1} className={`${field} ${styles.numberInput}`} value={settings.heroBanSeconds} onChange={(event) => onChange({ ...settings, heroBanSeconds: Number(event.target.value) })} /></label>
        </div> : null}
      </section>
      <section className="rounded-xl border bg-muted/10 px-4 py-2" aria-label="관전자 이벤트">
        <Toggle label="승부예측 사용" hint={!premium ? "Premium 클랜 전용" : !regularRoom ? "정규 내전 전용" : "관전자 코인 풀"} disabled={!premium || !regularRoom} checked={premium && regularRoom && formation.predictionEnabled} onChange={(checked) => { onFormationChange({ ...formation, predictionEnabled: checked }); setStage("match"); }} />
        {premium && regularRoom && formation.predictionEnabled ? <label className="mb-2 block border-t pt-3 text-xs">마감 시간(분)
          <input type="number" inputMode="numeric" aria-label="승부예측 마감 시간(분)" min={1} max={10} step={1} className={`${field} ${styles.numberInput}`} value={formation.predictionMinutes} onFocus={() => setStage("match")} onChange={(event) => { onFormationChange({ ...formation, predictionMinutes: Number(event.target.value) }); setStage("match"); }} />
          <span className="mt-2 block text-muted-foreground">경기 현황 진입부터 · 1~10분</span>
        </label> : null}
      </section>
    </fieldset>
  </div>;
}
