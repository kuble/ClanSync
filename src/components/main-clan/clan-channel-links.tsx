import {ArrowUpRight} from "lucide-react";
import {safeBoardUrl,type BoardChannel} from "@/lib/clan/board";

export function ClanChannelLinks({channels}:{channels:BoardChannel[]}){
  return <ul className="flex flex-wrap gap-2">{channels.map(channel=>{
    const url=safeBoardUrl(channel.url);
    return url&&<li key={channel.platform+channel.url}><a href={url} target="_blank" rel="noopener noreferrer" aria-label={channel.platform+" 방송 채널 열기 ↗"} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs font-medium text-primary transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-ring">{channel.platform}<ArrowUpRight className="size-3.5" aria-hidden/></a></li>;
  })}</ul>;
}
