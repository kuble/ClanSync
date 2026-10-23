import { Gamepad2 } from "lucide-react";

export function GameLogo({ slug, name, className = "size-5" }: { slug: string; name: string; className?: string }) {
  return slug === "overwatch" ? <span role="img" aria-label="오버워치 로고" className={`inline-block shrink-0 bg-current ${className}`} style={{ mask: "url(/images/overwatch/logo.svg) center / contain no-repeat" }} /> : <Gamepad2 className={className} aria-label={`${name} 아이콘`} />;
}
