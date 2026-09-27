import assert from "node:assert";
import { occupancyOf, canFit } from "../quota.js";
import { step, close } from "../flowrun.js";
import { render } from "../app.js";

const base = {
  state: { running: {}, done: [], cancelled: [], swept: [], applied: [] },
  events: [], capacity: 3, budget: 1,
  over_error_code: "E_OVER_QUOTA", task_error_code: "E_UNKNOWN_TASK", event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("occupancy returns a number", () => {
  assert.strictEqual(typeof occupancyOf({}), "number");
});

check("canFit returns a flag", () => {
  assert.strictEqual(typeof canFit({}, 1, 1), "boolean");
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
