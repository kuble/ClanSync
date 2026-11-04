import { useTranslator } from "#use-translator";
import { Layers3, ShieldCheck, Swords } from "lucide-react";

export function HofScoreboard({ sessions, matches, criterion, pending = false }: {
  sessions: number; matches: number; criterion: string; pending?: boolean;
}) {
  const tx = useTranslator();
  const metrics = [
    { label: "정규 내전", icon: Swords, value: sessions.toLocaleString(tx.locale), unit: "회" },
    { label: "전체 경기", icon: Layers3, value: matches.toLocaleString(tx.locale), unit: "경기" },
    { label: "등재 기준", icon: ShieldCheck, value: criterion, unit: "" },
  ];
  return (
    <dl className="grid grid-cols-3 gap-1.5">
      {metrics.map(({ label, icon: Icon, value, unit }) => <div key={label} className="flex min-w-0 flex-col justify-between gap-1 rounded-lg bg-background/30 p-2 text-foreground/75 sm:p-2.5">
        <dt className="flex items-center gap-1 text-xs text-muted-foreground"><Icon aria-hidden className="size-3.5 shrink-0" />{tx(label)}</dt>
        <dd className={unit ? "text-lg font-semibold tabular-nums sm:text-xl" : "my-auto break-keep text-sm font-semibold leading-snug"}>
          {pending ? "—" : tx(value)}{unit && !pending && <small className="ml-1 text-xs font-normal text-muted-foreground">{tx(unit)}</small>}
        </dd>
      </div>)}
    </dl>
  );
}
