"use client";

import { Fragment } from "react";
import Link from "next/link";
import { BrandSymbol } from "./brand-logo";
import { NavigationIcon } from "./navigation-icon";
import styles from "./header-breadcrumbs.module.css";

export function HeaderBreadcrumbs({ items, brandHref = "/games", brandLabel = "게임 선택", hideFirstOnMobile = false }: {
  items: { label: string; href?: string }[];
  brandHref?: string;
  brandLabel?: string;
  hideFirstOnMobile?: boolean;
}) {
  return <div className={styles.group} data-header-breadcrumbs>
    <Link href={brandHref} className={styles.brand} aria-label={brandLabel}><NavigationIcon icon={BrandSymbol} label={brandLabel} size={22} /></Link>
    {items.length > 0 && <nav aria-label="현재 위치" className={`${styles.breadcrumbs} ${hideFirstOnMobile ? styles.hideFirstOnMobile : ""}`}>
      {items.map((item, index) => <Fragment key={index}><span aria-hidden="true">/</span>{item.href ? <Link href={item.href}>{item.label}</Link> : <h2 className={styles.current} aria-current="page">{item.label}</h2>}</Fragment>)}
    </nav>}
  </div>;
}
