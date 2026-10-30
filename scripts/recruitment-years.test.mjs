import {test} from "node:test";
import assert from "node:assert/strict";
import {readRecruitmentYears,recruitmentProfileError,recruitmentYearLabel,lastRecruitmentYear} from "../src/lib/clan/recruitment.ts";

function form(from="",to="") {const value=new FormData();value.set("birth_year_from",from);value.set("min_birth_year",to);return value;}
test("birth-year form validation accepts empty, one-sided, inclusive and equal bounds",()=>{
  assert.deepEqual(readRecruitmentYears(form()),{ok:true,birth_year_from:null,min_birth_year:null});
  assert.equal(readRecruitmentYears(form("1990","")).birth_year_from,1990);
  assert.equal(readRecruitmentYears(form("","2005")).min_birth_year,2005);
  assert.equal(readRecruitmentYears(form("2000","2000")).ok,true);
  assert.equal(readRecruitmentYears(form("1950",String(lastRecruitmentYear()))).ok,true);
  for(const [from,to] of [["2005","1990"],["1949",""],["",String(lastRecruitmentYear()+1)],["2000.5",""],["NaN",""],["1e3",""]]) assert.equal(readRecruitmentYears(form(from,to)).ok,false);
});
test("display and eligibility use the same inclusive range and preserve the old upper-bound meaning",()=>{
  const conditions={birth_year_from:1990,min_birth_year:2005,gender_policy:"all"};
  assert.equal(recruitmentYearLabel(conditions),"1990~2005년생");
  for(const birth_year of [1990,2000,2005]) assert.equal(recruitmentProfileError(conditions,{birth_year,gender:"undisclosed"}),null);
  assert.match(recruitmentProfileError(conditions,{birth_year:1989,gender:"male"}),/이후 출생/);
  assert.match(recruitmentProfileError(conditions,{birth_year:2006,gender:"female"}),/이전 출생/);
  assert.equal(recruitmentYearLabel({...conditions,birth_year_from:null}),"2005년생까지");
  assert.equal(recruitmentYearLabel({...conditions,min_birth_year:null}),"1990년생부터");
  assert.equal(recruitmentYearLabel({birth_year_from:2000,min_birth_year:2000}),"2000년생");
  assert.equal(recruitmentYearLabel({birth_year_from:null,min_birth_year:null}),"출생연도 무관");
});
