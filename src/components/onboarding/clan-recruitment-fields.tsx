"use client";

import { useState } from "react";
import { Slider } from "@base-ui/react/slider";
import { Mars, Users, Venus } from "lucide-react";
import { FIRST_RECRUITMENT_YEAR, lastRecruitmentYear, recruitmentYearLabel, type ClanRecruitment } from "@/lib/clan/recruitment";
import styles from "./clan-recruitment-fields.module.css";

type Values = Pick<ClanRecruitment,"birth_year_from"|"min_birth_year"|"gender_policy">;
const unrestricted: Values = {birth_year_from:null,min_birth_year:null,gender_policy:"all"};
const genders = [{value:"all",label:"제한 없음",icon:Users},{value:"male",label:"남성",icon:Mars},{value:"female",label:"여성",icon:Venus}] as const;

export function ClanRecruitmentFields({initial=unrestricted,prefix,disabled=false,layout="stacked"}:{initial?:Values;prefix:string;disabled?:boolean;layout?:"stacked"|"grouped"}) {
  const [years, setYears] = useState(() => ({ birth_year_from: initial.birth_year_from, min_birth_year: initial.min_birth_year }));
  const [gender,setGender]=useState(initial.gender_policy);
  const [lastYear] = useState(lastRecruitmentYear);
  // Reserve a step beyond each real year so the first and last years stay selectable.
  const openStart = FIRST_RECRUITMENT_YEAR - 1, openEnd = lastYear + 1;
  const range = [years.birth_year_from ?? openStart, years.min_birth_year ?? openEnd];
  const genderField = <fieldset disabled={disabled} className={styles.group} aria-describedby={gender !== "all" ? `${prefix}-gender-hint` : undefined}>
    <legend>성별 조건</legend>
    <div className={styles.genders}>{genders.map(({value,label,icon:Icon})=><label key={value}><input type="radio" name="gender_policy" value={value} checked={gender===value} onChange={()=>setGender(value)} /><Icon size={15} aria-hidden /><span>{label}</span></label>)}</div>
    {gender !== "all" && <p id={`${prefix}-gender-hint`}>성별 비공개 계정은 신청할 수 없습니다.</p>}
  </fieldset>;
  return <div className={`${styles.fields} ${styles[layout]}`}>
    {layout === "grouped" && genderField}
    <fieldset disabled={disabled} className={styles.group}>
      <legend>출생연도</legend>
      <output className={styles.yearSummary}>{recruitmentYearLabel(years)}</output>
      <Slider.Root min={openStart} max={openEnd} value={range} disabled={disabled}
        thumbCollisionBehavior="none" onValueChange={([from, to]) => setYears({
          birth_year_from: from === openStart ? null : Math.min(from, lastYear),
          min_birth_year: to === openEnd ? null : Math.max(to, FIRST_RECRUITMENT_YEAR),
        })}>
        <Slider.Control className={styles.yearControl}>
          <Slider.Track className={styles.yearTrack}>
            <Slider.Indicator className={styles.yearIndicator} />
            {[0, 1].map(index => <Slider.Thumb key={index} index={index} className={styles.yearThumb}
              aria-label={index === 0 ? "출생연도 하한" : "출생연도 상한"}
              getAriaValueText={(_, value) => value === openStart || value === openEnd ? "제한 없음" : `${value}년생`} />)}
          </Slider.Track>
        </Slider.Control>
        <div className={styles.yearScale} aria-hidden="true">
          <span>제한 없음</span>
          {[1970, 2000].map(year => <span key={year} className={styles.yearTick}
            style={{left: `${(year - openStart) / (openEnd - openStart) * 100}%`}}>{year}</span>)}
          <span>제한 없음</span>
        </div>
      </Slider.Root>
      <input type="hidden" name="birth_year_from" value={years.birth_year_from ?? ""} />
      <input type="hidden" name="min_birth_year" value={years.min_birth_year ?? ""} />
    </fieldset>
    {layout === "stacked" && genderField}
  </div>;
}
