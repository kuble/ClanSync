"use client";

import { CHAT_SERVICES, readClanCommunityLinks, type ClanCommunityLinks } from "@/lib/clan/community-links";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChatServiceIcon } from "./chat-service-icon";
import styles from "./main-clan-shell.module.css";

export function ClanCommunityLinks({ links, discordEntryHref }: { links: ClanCommunityLinks; discordEntryHref?: string }) {
  const safeLinks = readClanCommunityLinks(links);
  if (discordEntryHref) safeLinks.discord = discordEntryHref;
  const services = CHAT_SERVICES.filter(({ id }) => safeLinks[id]);
  if (!services.length) return null;
  return <nav aria-label="클랜 채팅방" className="mt-2 flex max-w-full flex-wrap items-center gap-1.5">
    {services.map(({ id, label }) => <Tooltip key={id}>
      <TooltipTrigger render={<a href={safeLinks[id]} target="_blank" rel="noopener noreferrer" aria-label={`${label} 열기`} className={`inline-flex size-8 items-center justify-center rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${styles.communityLink}`} />}><ChatServiceIcon service={id} /></TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>)}
  </nav>;
}
