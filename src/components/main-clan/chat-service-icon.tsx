import { CHAT_SERVICES, type ChatServiceId } from "@/lib/clan/community-links";
import { cn } from "@/lib/utils";

export function ChatServiceIcon({ service, className }: { service: ChatServiceId; className?: string }) {
  const icon = CHAT_SERVICES.find(entry => entry.id === service)!.icon;
  return <span aria-hidden="true" className={cn("inline-block size-4 shrink-0 bg-current [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]", className)} style={{ maskImage: `url(/icons/chat/${icon}.svg)` }} />;
}
