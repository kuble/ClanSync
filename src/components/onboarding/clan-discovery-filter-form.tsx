"use client";

import { useTransition, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./clan-discovery.module.css";

export function ClanDiscoveryFilterForm({children, action}: {children: ReactNode; action: string}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new URLSearchParams();
    new FormData(event.currentTarget).forEach((value, key) => {
      if (typeof value === "string" && value) query.set(key, value);
    });
    startTransition(() => router.push(`${action}?${query}`, {scroll: false}));
  }
  return <form action={action} method="get" className={styles.filters} onSubmit={submit} aria-busy={pending}
    onChange={event => { if (event.target instanceof HTMLInputElement && event.target.name === "eligible") event.currentTarget.requestSubmit(); }}>
    {children}
    <span role="status" className={styles.filterStatus}>{pending ? "조건에 맞는 클랜을 찾고 있습니다." : ""}</span>
  </form>;
}
