"use client";

import { useRef } from "react";
import { Users, Scale, CalendarDays, Swords, Trophy, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./entry.module.css";

const features = [
  { icon: Users, title: "클랜관리 도구", description: "가입 신청과 멤버 권한을 관리하고, 공지로 클랜 소식을 함께 나누세요." },
  { icon: Scale, title: "내전 팀 편성", description: "참가자를 모으고 팀을 구성하세요. 경기 결과를 기록하며 다음 내전을 준비할 수 있어요." },
  { icon: CalendarDays, title: "일정과 투표", description: "내전과 모임 일정을 등록하고, 투표로 클랜원들의 의견을 한곳에 모으세요." },
  { icon: Swords, title: "스크림 매칭", description: "다른 클랜과 스크림을 모집하고, 대화로 일정을 조율하며 경기를 준비하세요." },
  { icon: Trophy, title: "이벤트 대진표", description: "참가 팀과 대진을 구성하고 라운드마다 경기 진행 상황을 확인하세요." },
  { icon: BarChart3, title: "클랜 경기 통계", description: "기록한 내전의 승패와 멤버별 성적을 살펴보고, 함께한 플레이를 돌아보세요." },
];

export function LandingFeatures() {
  const railRef = useRef<HTMLDivElement>(null);
  function scroll(direction: number) {
    const rail = railRef.current;
    if (!rail) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rail.scrollBy({ left: direction * rail.clientWidth, behavior: reduceMotion ? "instant" : "smooth" });
  }
  return (
    <section id="features" className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>지원 기능</h2>
        <div className={styles.railButtons}>
          <button type="button" aria-label="이전 기능" onClick={() => scroll(-1)}><ChevronLeft size={16} /></button>
          <button type="button" aria-label="다음 기능" onClick={() => scroll(1)}><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className={styles.featureRail} ref={railRef} tabIndex={0} aria-label="ClanSync 지원 기능 목록">
        {features.map(({ icon: Icon, title, description }) => (
          <article className={styles.featureCard} key={title}>
            <Icon className={styles.featureIcon} size={30} strokeWidth={1.5} aria-hidden="true" />
            <h3>{title}</h3><p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
