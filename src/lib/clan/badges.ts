export const CLAN_BADGES = [
  {key:"founding",name:"창단",group:"기념",icon:"flame",target:0,story:"우리 이름으로 첫 깃발을 세웠던 날"},
  {key:"regular-1",name:"첫 정규 내전",group:"정규 내전",icon:"swords",target:1,story:"처음으로 함께 끝낸 정규 내전"},
  {key:"regular-10",name:"정규 내전 10회",group:"정규 내전",icon:"swords",target:10,story:"한 번의 만남이 우리의 일상이 됐어요"},
  {key:"regular-50",name:"정규 내전 50회",group:"정규 내전",icon:"swords",target:50,story:"오십 번의 팀과 웃음을 함께 쌓았어요"},
  {key:"regular-100",name:"내전 100회",group:"정규 내전",icon:"swords",target:100,story:"백 번을 함께한 우리 클랜의 기록"},
  {key:"regular-500",name:"내전 500회",group:"정규 내전",icon:"shield",target:500,story:"오백 번의 경기 너머에도 함께해요"},
  {key:"flash-1",name:"첫 깜짝 내전",group:"깜짝 내전",icon:"sparkles",target:1,story:"갑자기 모여도 즐거웠던 첫날"},
  {key:"flash-10",name:"깜짝 내전 10회",group:"깜짝 내전",icon:"sparkles",target:10,story:"예고 없이 모인 열 번의 즐거움"},
  {key:"anniversary",name:"1주년",group:"기념",icon:"cake",target:0,story:"사계절을 지나 다시 함께 맞은 날"},
] as const;
export type ClanBadgeKey=(typeof CLAN_BADGES)[number]["key"];
export type ClanBadge = (typeof CLAN_BADGES)[number] & {earned:boolean;earnedAt:string|null;awardedAt:string|null;progress:string;isNew:boolean};
export type ClanBadgeCollection = {badges:ClanBadge[];featured:ClanBadgeKey[]|null;clanName:string;createdAt:string;userId:string};
export function badgeAnniversary(createdAt:string){const date=new Date(createdAt);date.setUTCFullYear(date.getUTCFullYear()+1);return date.toISOString();}
