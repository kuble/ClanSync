import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPercent } from "../src/lib/format-percent.ts";

test("percent labels retain one decimal for whole values, rounding and missing results", () => {
  for (const [value, label] of [[0,"0.0%"],[53,"53.0%"],[100,"100.0%"],[57.44,"57.4%"],[57.46,"57.5%"],[null,"—"],[undefined,"—"],[NaN,"—"],[Infinity,"—"]]) assert.equal(formatPercent(value), label);
  assert.equal(formatPercent(null, "기록 없음"), "기록 없음");
});
