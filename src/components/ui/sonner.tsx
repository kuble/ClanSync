"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

/**
 * Sonner 기본 구현은 레이아웃 트리 안에 두면 부모의 transform·overflow·stacking 때문에
 * fixed 토스트가 화면 밖으로 밀리거나 가려질 수 있음 → body 포털로 고정.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <Sonner
      theme="dark"
      position="top-center"
      offset={72}
      visibleToasts={5}
      richColors
      closeButton
      className="toaster group z-[2147483646]"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        duration: 4500,
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />,
    document.body,
  )
}

export { Toaster }
