import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import ts from "typescript";

const input = "src/lib/supabase/database.types.ts";
const source = ts.createSourceFile(input, readFileSync(input, "utf8"), ts.ScriptTarget.Latest, true);
const database = source.statements.find(node => ts.isTypeAliasDeclaration(node) && node.name.text === "Database");
assert.ok(database && ts.isTypeLiteralNode(database.type), "Generated Database type is missing");
function members(node, name) {
  const member = node.members.find(item => item.name?.getText(source).replaceAll('"', '') === name);
  assert.ok(member?.type && ts.isTypeLiteralNode(member.type), `Missing schema section: ${name}`);
  return member.type;
}
const schema = members(database.type, "public");
const tables = members(schema, "Tables").members;
const functions = members(schema, "Functions").members;
const enums = members(schema, "Enums").members;
const name = node => node.name.getText(source).replaceAll('"', '');
const lines = ["# 현재 DB 구조 색인", "", "`npm run db:schema:index`로 앱의 생성 타입에서 재생성한다. 앱 타입과 QA DB 타입을 동기화한 뒤 실행한다. 이 문서는 전체 SQL 덤프나 운영 DB 적용 상태를 뜻하지 않는다.", "", "- 원본: [생성 타입](../../../src/lib/supabase/database.types.ts)", "- 변경 이력: [마이그레이션](../../../supabase/migrations/). 적용된 이력은 삭제·재번호·병합하지 않는다.", "- QA 확인: `npm run db:test:types` → 생성 타입 대조·동기화 → `npm run db:schema:index`.", "- RLS·제약·함수 본문은 타입에 포함되지 않으므로 해당 마이그레이션을 확인한다. 운영 반영은 별도 승인 범위다.", "", `테이블 ${tables.length}개 · 함수 ${functions.length}개 · 열거형 ${enums.length}개.`, "", "## 테이블", "", "| 이름 | 열 수 | 관계 수 |", "| --- | ---: | ---: |"];
for (const table of tables) {
  const row = members(table.type, "Row");
  const relationships = table.type.members.find(item => name(item) === "Relationships")?.type;
  assert.ok(relationships && ts.isTupleTypeNode(relationships), `Missing relationships: ${name(table)}`);
  lines.push(`| \`${name(table)}\` | ${row.members.length} | ${relationships.elements.length} |`);
}
lines.push("", "## 함수", "", ...functions.map(node => `- \`${name(node)}\``), "", "## 열거형", "", ...enums.map(node => `- \`${name(node)}\`: ${node.type.getText(source).replace(/\s+/g, " ")}`), "");
const output = "docs/02-design/database/current-schema.md";
mkdirSync("docs/02-design/database", { recursive: true });
writeFileSync(output, lines.join("\n"));
console.log(`${output}: ${tables.length} tables, ${functions.length} functions, ${enums.length} enums`);
