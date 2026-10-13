"use client";
import {Button} from "@/components/ui/button";
export default function BadgeError({reset}:{reset:()=>void}){return <section className="flex min-h-96 flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card"><h2 className="text-lg font-semibold">클랜 배지 케이스</h2><p role="alert" className="text-sm text-muted-foreground">배지 기록을 불러오지 못했습니다.</p><Button variant="outline" onClick={reset}>다시 불러오기</Button></section>;}
