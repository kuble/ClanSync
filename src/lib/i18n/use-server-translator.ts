import "server-only";
import { use } from "react";
import { getTranslator } from "./server";
export function useTranslator() {
  return use(getTranslator());
}
