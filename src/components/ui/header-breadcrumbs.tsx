"use client";

import { useTranslator } from "#use-translator";
import { Fragment } from "react";
import Link from "next/link";
import { BrandSymbol } from "./brand-logo";
import { NavigationIcon } from "./navigation-icon";
import styles from "./header-breadcrumbs.module.css";

export function HeaderBreadcrumbs({ items, brandHref = "/games", brandLabel = "게임 선택", currentOnlyOnMobile = false }: {
  items: { label: string; href?: string; translate?: boolean }[];
  brandHref?: string;
  brandLabel?: string;
  currentOnlyOnMobile?: boolean;
}) {
  const tx = useTranslator();
  return <div className={styles.group} data-header-breadcrumbs>
    <Link href={brandHref} className={styles.brand} aria-label={brandLabel}><NavigationIcon icon={BrandSymbol} label={brandLabel} size={22} /></Link>
    {items.length > 0 && <nav aria-label={tx("현재 위치")} className={`${styles.breadcrumbs} ${currentOnlyOnMobile ? styles.currentOnlyOnMobile : ""}`}>
      {items.map((item, index) => <Fragment key={index}><span aria-hidden="true">/</span>{item.href ? <Link href={item.href}>{item.translate === false ? item.label : tx(item.label)}</Link> : <h2 className={styles.current} aria-current="page">{item.translate === false ? item.label : tx(item.label)}</h2>}</Fragment>)}
    </nav>}
  </div>;
}
