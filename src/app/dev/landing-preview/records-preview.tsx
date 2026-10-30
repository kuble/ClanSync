"use client";

import { useMemo, type ReactNode } from "react";
import { HallOfFame } from "@/components/main-clan/clan-hall-of-fame";
import { IntraClanStats } from "@/components/main-clan/clan-intra-stats";
import { PersonalStats } from "@/components/main-clan/clan-personal-stats";
import { ClanStatsArchive } from "@/components/main-clan/clan-stats-archive";
import { HofCommentsCard } from "@/components/main-clan/hof-comments";
import { ClanComments, ClanCommentComposer } from "@/components/main-clan/clan-comments";
import { CardContent } from "@/components/ui/card";
import { ProfileIdentity } from "@/components/profile/profile-identity";
import { PersonalEmblemCaseDisplay } from "@/components/personal-emblems/personal-emblem-case";
import type { ClanArchiveMatch } from "@/lib/clan/stats/load-clan-stats";
import { PreviewPagination } from "./preview-pagination";
import { exampleEmblems, statsExampleModel } from "./stats-example-data";
import styles from "./stats-preview.module.css";

const noop = () => {};
const comments = [
  { id: "example-comment-1", authorId: null, nickname: "하루", content: "이번 달도 함께해서 즐거웠어요!", createdAt: "2026-10-30T12:00:00Z", isMine: false, canDelete: false, reactions: [] },
  { id: "example-comment-2", authorId: null, nickname: "여울", content: "다음 내전도 기대할게요.", createdAt: "2026-10-30T12:02:00Z", isMine: true, canDelete: false, reactions: [] },
];

function ExampleReactions() {
  return <HofCommentsCard label="순위" disabled onRefresh={noop}><CardContent className="flex min-h-0 flex-1 flex-col justify-between gap-3" inert>
    <ClanComments comments={comments} clanId="landing-example" targetKind="hof_comment" disabled onReact={noop} onDelete={noop} loadReactionPeople={async () => ({ ok: true, names: [] })} />
    <ClanCommentComposer label="순위 보고 한마디" value="" onChange={noop} onSubmit={noop} maxLength={500} disabled placeholder="이번 순위에 한마디 남겨보십시오." />
  </CardContent></HofCommentsCard>;
}

function ExampleProfile() {
  return <section aria-label="플레이어 배너" className="overflow-hidden rounded-xl border bg-card" inert>
    <ProfileIdentity readOnly userId="example-0" intro="함께 성장하는 클랜원" memberships={[]}
      games={[{ gameSlug: "overwatch", gameName: "오버워치", accountId: "여울#1001", isVerified: true, altAccounts: ["여울Alt#1002"] }]}
      emblemCase={<PersonalEmblemCaseDisplay featured={exampleEmblems} href="#records" nickname="여울" />} />
  </section>;
}

function Screen({ title, className = "", children }: { title: string; className?: string; children: ReactNode }) {
  return <figure className={`${styles.screen} ${className}`}>
    <div className={styles.body}>{children}</div>
    <figcaption><span>{title}</span><span>실제 서비스 UI · 예시 데이터 · 일부 항목 표시</span></figcaption>
  </figure>;
}

export function RecordsPreview({ records }: { records: ClanArchiveMatch[] }) {
  const model = useMemo(() => statsExampleModel(records), [records]);
  const personalProps = { model, selectedId: "example-0", onBack: noop, gameSlug: "overwatch", clanId: model.clanId };
  return <PreviewPagination label="기록과 통계" slides={[
    { id: "hof", label: "명예의 전당", content: <Screen title="다양한 활약을 기록하는 명예의 전당" className={styles.hall}>
      <HallOfFame model={model} clanId={model.clanId} onChoosePerson={noop} reactions={<ExampleReactions />} />
    </Screen> },
    { id: "clan", label: "클랜 통계", content: <Screen title="맵별 경기 · 영웅 밴 · 선호 맵" className={styles.clan}>
      <IntraClanStats model={model} />
    </Screen> },
    { id: "archive", label: "경기 기록", content: <Screen title="팀 구성과 승패, 이날의 내전 기록" className={styles.archive}>
      <ClanStatsArchive archive={model.archive} />
    </Screen> },
    { id: "personal", label: "개인 기록", content: <Screen title="프로필과 엠블럼, 역할별 성적" className={styles.personal}>
      <PersonalStats {...personalProps} banner={<ExampleProfile />} />
    </Screen> },
    { id: "synergy", label: "맵과 시너지", content: <Screen title="나에게 맞는 전장과 호흡이 맞는 멤버" className={styles.synergy}>
      <PersonalStats {...personalProps} banner={null} initialPeerId="peer-1" />
    </Screen> },
  ]} />;
}
