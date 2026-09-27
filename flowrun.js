// flowrun.js：按预算回收取消账
import { occupancyOf, canFit } from "./quota.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function cloneState(state) {
  const source = state || {};
  return {
    running: Object.assign({}, source.running),
    done: (source.done || []).slice(),
    cancelled: (source.cancelled || []).slice(),
    swept: (source.swept || []).slice(),
    applied: (source.applied || []).slice()
  };
}

function hasOwn(map, key) {
  return Object.prototype.hasOwnProperty.call(map, key);
}

function sweep(state, limit) {
  let moved = 0;
  while (moved < limit && state.cancelled.length > 0) {
    state.swept.push(state.cancelled.shift());
    moved += 1;
  }
  return moved;
}

function badEvent(event) {
  if (!event || typeof event !== "object") return true;
  if (event.id === undefined || event.id === null) return true;
  if (event.task === undefined || event.task === null) return true;
  if (event.kind !== "start" && event.kind !== "finish" && event.kind !== "cancel") return true;
  if (event.kind === "start") {
    if (typeof event.cost !== "number" || !Number.isFinite(event.cost) || event.cost < 0) return true;
  }
  return false;
}

export function step(spec) {
  const overCode = spec.over_error_code || "E_OVER_QUOTA";
  const taskCode = spec.task_error_code || "E_UNKNOWN_TASK";
  const eventCode = spec.event_error_code || "E_BAD_EVENT";
  const capacity = spec.capacity === undefined ? 0 : spec.capacity;
  const events = spec.events || [];
  let budgetLeft = spec.budget === undefined ? 0 : spec.budget;

  const state = cloneState(spec.state);
  const applied = new Set(state.applied);
  const settled = new Set(state.done.concat(state.cancelled, state.swept));
  const sweptBefore = state.swept.length;
  let dupStart = 0;
  let judged = 0;

  for (const event of events) {
    if (badEvent(event)) fail(eventCode, "bad event");
    if (applied.has(event.id)) continue;
    if (event.kind === "start") {
      if (settled.has(event.task) || hasOwn(state.running, event.task)) {
        dupStart += 1;
      } else {
        if (!canFit(state.running, event.cost, capacity)) fail(overCode, "over quota");
        state.running[event.task] = event.cost;
      }
    } else {
      if (!hasOwn(state.running, event.task)) fail(taskCode, "unknown task");
      delete state.running[event.task];
      if (event.kind === "finish") {
        state.done.push(event.task);
      } else {
        state.cancelled.push(event.task);
      }
      settled.add(event.task);
    }
    applied.add(event.id);
    state.applied.push(event.id);
    judged += 1;
    budgetLeft -= sweep(state, budgetLeft);
  }

  return { state, running: state.running, done: state.done, cancelled: state.cancelled,
           swept: state.swept, swept_count: state.swept.length - sweptBefore,
           dup_start: dupStart, occupancy: occupancyOf(state.running),
           pending_before: state.cancelled.length, pending_ids: state.cancelled.slice(),
           catchup: 0, judged, judged_bound: events.length };
}

export function close(spec) {
  const state = cloneState(spec.state);
  const catchup = sweep(state, state.cancelled.length);
  return { state, catchup };
}
