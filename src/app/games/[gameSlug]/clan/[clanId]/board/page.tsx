import { redirect } from "next/navigation";
export default async function BoardPage({params}:{params:Promise<{gameSlug:string;clanId:string}>}){const p=await params;redirect("/games/"+p.gameSlug+"/clan/"+p.clanId+"/board/notices");}
