export function PlayerNickname({ name }: { name: string }) {
  const tag = /#[^#\s]+$/.exec(name);
  if (!tag || tag.index === 0) return name;

  return <>{name.slice(0, tag.index)}<span className="text-[0.85em] font-normal text-muted-foreground">{tag[0]}</span></>;
}
