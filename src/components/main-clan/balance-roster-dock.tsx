"use client";

import { useId, useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./balance-roster-dock.module.css";

type Position = "top" | "left" | "right" | "bottom";
const positions: { value: Position; label: string }[] = [
  { value: "top", label: "위" }, { value: "left", label: "왼쪽" },
  { value: "right", label: "오른쪽" }, { value: "bottom", label: "아래" },
];
const DRAG_TYPE = "application/x-clansync-member-panel";

export function BalanceRosterDock({ members, children }: {
  members: (handle: ReactNode) => ReactNode;
  children: ReactNode;
}) {
  const helpId = useId();
  const [position, setPosition] = useState<Position>("left");
  const [dragging, setDragging] = useState(false);
  const [target, setTarget] = useState<Position | null>(null);
  const finish = () => { setDragging(false); setTarget(null); };
  const handle = <div className="flex items-center gap-1">
    <button type="button" draggable className={styles.handle} aria-label="클랜원 목록 이동" aria-describedby={helpId}
      title="끌어서 이동 · 방향키로 배치"
      onDragStart={(event) => {
        event.dataTransfer.setData(DRAG_TYPE, "members");
        event.dataTransfer.effectAllowed = "move";
        setDragging(true);
      }}
      onDragEnd={finish}
      onKeyDown={(event) => {
        const direction = { ArrowUp: "top", ArrowLeft: "left", ArrowRight: "right", ArrowDown: "bottom" }[event.key];
        if (direction) { event.preventDefault(); setPosition(direction as Position); }
        if (event.key === "Escape") finish();
      }}>
      <GripVertical className="size-4" aria-hidden="true" />
    </button>
    <select aria-label="클랜원 목록 위치" value={position} className={styles.positionSelect}
      onChange={(event) => setPosition(event.target.value as Position)}>
      {positions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
    </select>
  </div>;
  return <div className={styles.container}>
    <p id={helpId} className="sr-only">손잡이를 참여자 목록의 위, 왼쪽, 오른쪽, 아래로 끌어 배치하세요. 방향키나 위치 선택으로도 옮길 수 있습니다.</p>
    <div className={styles.layout} data-member-position={position}>
      <div className={cn(styles.members, dragging && "opacity-50")}>{members(handle)}</div>
      <div className={styles.board}>
        {children}
        {dragging && <div className={styles.targets} aria-label="클랜원 목록 부착 위치">
          {positions.map((item) => <button type="button" key={item.value} data-dock-target={item.value}
            className={cn(styles.target, styles[item.value], target === item.value && styles.targetActive)}
            aria-label={`클랜원 목록 ${item.label}에 부착`}
            onDragOver={(event) => {
              if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setTarget(item.value);
            }}
            onDragLeave={() => setTarget(null)}
            onDrop={(event) => {
              if (event.dataTransfer.getData(DRAG_TYPE) !== "members") return;
              event.preventDefault();
              event.stopPropagation();
              setPosition(item.value);
              finish();
            }}
            onClick={() => { setPosition(item.value); finish(); }}>{item.label}</button>)}
        </div>}
      </div>
    </div>
  </div>;
}
