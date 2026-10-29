import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import ts from "typescript";

const labels = new Set(["필요", "주요", "중요", "개요", "소요", "수요", "좋아요"]);
function files(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]); }

test("system UI copy uses formal Korean while keeping noun labels such as 좋아요", () => {
  const found = [];
  for (const file of files("src").filter(path => /\.tsx?$/.test(path))) {
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
        for (const match of node.text.matchAll(/[가-힣]+(?:요|죠)(?=[.!?…\s]|$)/g)) {
          if (!labels.has(match[0])) found.push(`${file}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}: ${match[0]}`);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.deepEqual(found, [], "System copy must use 합니다/하십시오 forms; user-authored content is not scanned.");
});
