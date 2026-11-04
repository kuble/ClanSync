"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function useStatsFetchToast(pending: boolean, message: string) {
  useEffect(() => {
    if (!pending) return;
    let id: ReturnType<typeof toast.loading> | undefined;
    const timer = window.setTimeout(() => { id = toast.loading(message); }, 250);
    return () => {
      window.clearTimeout(timer);
      if (id !== undefined) toast.dismiss(id);
    };
  }, [pending, message]);
}
