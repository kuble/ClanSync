"use client";

import { useMemo } from "react";
import { IntraClanStats } from "@/components/main-clan/clan-intra-stats";
import { PersonalStats } from "@/components/main-clan/clan-personal-stats";
import { ClanStatsArchive } from "@/components/main-clan/clan-stats-archive";
import type { ClanArchiveMatch } from "@/lib/clan/stats/load-clan-stats";
import { PreviewPagination } from "./preview-pagination";
import { ShowcaseFrame } from "./showcase-frame";
import { statsExampleModel } from "./stats-example-data";
import styles from "./showcase.module.css";

export function RecordsPreview({ records }: { records: ClanArchiveMatch[] }) {
  const model = useMemo(() => statsExampleModel(records), [records]);
  return <PreviewPagination label="기록과 통계" slides={[
    { id: "clan", label: "클랜 통계", content: <ShowcaseFrame title="우리 클랜이 즐겨온 경기를 한눈에." description="자주 플레이한 맵과 영웅 밴, 선호하는 전장을 살펴보세요."><div className={styles.clan}><IntraClanStats model={model} /></div></ShowcaseFrame> },
    { id: "archive", label: "경기 기록", content: <ShowcaseFrame title="그날의 팀 구성과 승패를 남겨요." description="경기마다 누가 함께했는지, 어떤 전장에서 겨뤘는지 돌아볼 수 있어요."><div className={styles.archive}><ClanStatsArchive archive={model.archive} /></div></ShowcaseFrame> },
    { id: "personal", label: "개인 기록", content: <ShowcaseFrame title="함께한 경기가 나만의 기록으로." description="역할별 승률과 최근 전적, 연승 기록으로 나의 활약을 확인해요."><div className={styles.personal}><PersonalStats model={model} selectedId="example-0" onBack={() => {}} gameSlug="overwatch" clanId={model.clanId} banner={null} /></div></ShowcaseFrame> },
  ]} />;
}
