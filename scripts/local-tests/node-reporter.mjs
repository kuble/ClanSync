import { emit } from "./events.mjs";
export default async function* report(source) {
  for await (const event of source) {
    const data = event.data;
    if (["test:dequeue", "test:complete"].includes(event.type) && data.file && data.line) {
      const fileWrapper = data.name.endsWith(".mjs") && data.file.replaceAll("\\","/").endsWith(data.name.replaceAll("\\","/"));
      if (fileWrapper) { emit({ type: "file", title: data.name, status: event.type === "test:dequeue" ? "start" : "end" }); continue; }
      emit({ type: "test", status: data.skip ? "skip" : event.type === "test:dequeue" ? "start" : data.details?.passed ? "pass" : "fail", id: `${data.file}:${data.line}:${data.name}`, title: data.name, file: data.file, line: data.line, duration: data.details?.duration_ms, error: data.details?.error?.stack || data.details?.error?.message });
      yield `${event.type} ${data.name}\n`;
      if (event.type === "test:complete" && !data.details?.passed && !data.skip)
        yield `${data.details?.error?.stack || data.details?.error?.message || "검사 실패"}\n`;
    }
  }
}
