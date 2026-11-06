"use client";
import { useTranslator } from "#use-translator";
import { Button } from "@/components/ui/button";
export default function BoardError({retry}:{retry:()=>void}){
  const tx = useTranslator();return <div className="flex min-h-96 flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card"><p role="alert">{tx("게시판을 불러오지 못했습니다.")}</p><Button onClick={retry} variant="outline">{tx("다시 불러오기")}</Button></div>;}
