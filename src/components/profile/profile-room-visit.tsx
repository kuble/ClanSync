"use client";

import { useTheme } from "next-themes";
import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { HousingRoom } from "./housing-room";
import type { PlayerProfileVisit } from "@/lib/profile/visibility";
import styles from "./housing.module.css";

const noop = () => {};
const subscribe = () => noop;
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function ProfileRoomVisit({ housing }: { housing: PlayerProfileVisit["housing"] }) {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const router = useRouter();
  useEffect(() => {
    const refresh = () => router.refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [router]);
  return <section className={styles.housing} data-embedded="true" aria-label="프로필 하우징">
    <HousingRoom readOnly inventory={housing.inventory} catalog={housing.catalog} selectedId={null} editing={false} pending={false}
      theme={mounted && resolvedTheme === "light" ? "light" : "dark"} wallpaper={housing.room.wallpaper} floor={housing.room.floor}
      onBeginMove={noop} onSelect={noop} onMove={noop} onDrop={noop} onRotate={noop} onStore={noop} />
  </section>;
}
