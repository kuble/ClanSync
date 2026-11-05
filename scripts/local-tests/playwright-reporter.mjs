import { emit } from "./events.mjs";
export default class Reporter {
  onBegin(_config, suite) { emit({ type: "planned", total: suite.allTests().length }); }
  onTestBegin(test) { emit({ type: "test", status: "start", id: test.id, title: test.titlePath().slice(1).join(" › "), file: test.location.file, line: test.location.line }); }
  onTestEnd(test, result) { emit({ type: "test", status: result.status === "passed" ? "pass" : result.status === "skipped" ? "skip" : "fail", id: test.id, title: test.titlePath().slice(1).join(" › "), file: test.location.file, line: test.location.line, duration: result.duration, error: result.errors.map(error => error.message).join("\n") }); }
  onError(error) { emit({ type: "error", error: error.message }); }
}
