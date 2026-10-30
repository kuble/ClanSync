"use client";

import { useState } from "react";
import { Mars, Users, Venus } from "lucide-react";
import { FIRST_RECRUITMENT_YEAR, lastRecruitmentYear, type ClanRecruitment } from "@/lib/clan/recruitment";
import styles from "./clan-recruitment-fields.module.css";

type Values = Pick<ClanRecruitment,"birth_year_from"|"min_birth_year"|"gender_policy">;
const unrestricted: Values = {birth_year_from:null,min_birth_year:null,gender_policy:"all"};
const genders = [{value:"all",label:"제한 없음",icon:Users},{value:"male",label:"남성",icon:Mars},{value:"female",label:"여성",icon:Venus}] as const;

export function ClanRecruitmentFields({initial=unrestricted,prefix,disabled=false}:{initial?:Values;prefix:string;disabled?:boolean}) {
  const [from,setFrom]=useState(initial.birth_year_from?.toString()??"");
  const [to,setTo]=useState(initial.min_birth_year?.toString()??"");
  const [gender,setGender]=useState(initial.gender_policy);
  const last=lastRecruitmentYear();
  const years=Array.from({length:last-FIRST_RECRUITMENT_YEAR+1},(_,index)=>last-index);
  return <div className={styles.fields}>
    <fieldset disabled={disabled} className={styles.group}><legend>출생연도</legend><div className={styles.years}>
      <label htmlFor={`${prefix}-year-from`}>하한<select id={`${prefix}-year-from`} name="birth_year_from" aria-label="출생연도 하한" value={from} onChange={event=>setFrom(event.target.value)}><option value="">제한 없음</option>{years.filter(year=>!to || year<=Number(to)).map(year=><option key={year} value={year}>{year}년생</option>)}</select></label>
      <span aria-hidden>~</span>
      <label htmlFor={`${prefix}-year`}>상한<select id={`${prefix}-year`} name="min_birth_year" aria-label="출생연도 상한" value={to} onChange={event=>setTo(event.target.value)}><option value="">제한 없음</option>{years.filter(year=>!from || year>=Number(from)).map(year=><option key={year} value={year}>{year}년생</option>)}</select></label>
    </div></fieldset>
    <fieldset disabled={disabled} className={styles.group} aria-describedby={`${prefix}-gender-hint`}><legend>성별 조건</legend><div className={styles.genders}>{genders.map(({value,label,icon:Icon})=><label key={value}><input type="radio" name="gender_policy" value={value} checked={gender===value} onChange={()=>setGender(value)} /><Icon size={17} aria-hidden /><span>{label}</span></label>)}</div><p id={`${prefix}-gender-hint`}>비공개 계정은 성별 제한 클랜에 신청할 수 없습니다.</p></fieldset>
  </div>;
}
