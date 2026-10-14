export const CLAN_BADGES = [
  {key:"founding",name:"창단",group:"기념",icon:"flame",target:0,story:"우리 이름으로 첫 깃발을 세웠던 날"},
  {key:"regular-1",name:"첫 정규 내전",group:"정규 내전",icon:"swords",target:1,story:"처음으로 함께 끝낸 정규 내전"},
  {key:"regular-10",name:"정규 내전 10회",group:"정규 내전",icon:"swords",target:10,story:"한 번의 만남이 우리의 일상이 됐어요"},
  {key:"regular-50",name:"정규 내전 50회",group:"정규 내전",icon:"swords",target:50,story:"오십 번의 팀과 웃음을 함께 쌓았어요"},
  {key:"regular-100",name:"내전 100회",group:"정규 내전",icon:"swords",target:100,story:"백 번을 함께한 우리 클랜의 기록"},
  {key:"regular-500",name:"내전 500회",group:"정규 내전",icon:"shield",target:500,story:"오백 번의 경기 너머에도 함께해요"},
  {key:"flash-1",name:"첫 깜짝 내전",group:"깜짝 내전",icon:"sparkles",target:1,story:"갑자기 모여도 즐거웠던 첫날"},
  {key:"flash-10",name:"깜짝 내전 10회",group:"깜짝 내전",icon:"sparkles",target:10,story:"예고 없이 모인 열 번의 즐거움"},
  {key:"anniversary",name:"1주년",group:"기념",icon:"shield",target:0,years:1,story:"사계절을 지나 같은 뿌리에서 자란 우리"},
  {key:"anniversary-3",name:"3주년",group:"기념",icon:"shield",target:0,years:3,story:"세 번의 사계절을 함께 지나온 인연"},
  {key:"anniversary-5",name:"5주년",group:"기념",icon:"shield",target:0,years:5,story:"다섯 해의 기억이 단단한 역사가 됐어요"},
  {key:"anniversary-10",name:"10주년",group:"기념",icon:"shield",target:0,years:10,story:"십 년을 함께 뿌리내린 우리 클랜"},
  {key:"members-10",name:"멤버 10명",group:"멤버",icon:"shield",target:10,story:"우리의 보금자리에 첫 탑이 세워졌어요"},
  {key:"members-20",name:"멤버 20명",group:"멤버",icon:"shield",target:20,story:"새로운 동료와 함께 세 탑을 세웠어요"},
  {key:"members-50",name:"멤버 50명",group:"멤버",icon:"shield",target:50,story:"오십 명의 이름이 우리의 성채를 넓혔어요"},
  {key:"members-100",name:"멤버 100명",group:"멤버",icon:"shield",target:100,story:"백 명이 모여 단단한 성채를 완성했어요"},
] as const;
export type ClanBadgeKey=(typeof CLAN_BADGES)[number]["key"];
export type ClanBadge = (typeof CLAN_BADGES)[number] & {earned:boolean;earnedAt:string|null;awardedAt:string|null;progress:string;isNew:boolean};
export type ClanBadgeCollection = {badges:ClanBadge[];featured:ClanBadgeKey[]|null;clanName:string;createdAt:string;userId:string};
export const CLAN_BADGE_ARTWORK:Partial<Record<ClanBadgeKey,string>>={
  founding:"/clan-badges/founding-first-banner.png",
  anniversary:"/clan-badges/anniversary-growing-history-1y-gold-v2.png",
  "anniversary-3":"/clan-badges/anniversary-growing-history-3y-gold-v2.png",
  "anniversary-5":"/clan-badges/anniversary-growing-history-5y-gold-v2.png",
  "anniversary-10":"/clan-badges/anniversary-growing-history-10y-gold-v2.png",
  "members-10":"/clan-badges/members-shared-citadel-10.png",
  "members-20":"/clan-badges/members-shared-citadel-20.png",
  "members-50":"/clan-badges/members-shared-citadel-50.png",
  "members-100":"/clan-badges/members-shared-citadel-100.png",
};
export function badgeAnniversary(createdAt:string,years=1){const date=new Date(createdAt);date.setUTCFullYear(date.getUTCFullYear()+years);return date.toISOString();}
