// flowrun.js：按预算回收取消账（基线：一律给空表）
import { occupancyOf, canFit } from "./quota.js";

export function step(spec) {
  return { state: spec.state, running: {}, done: [], cancelled: [], swept: [], swept_count: 0,
           dup_start: 0, occupancy: 0, pending_before: 0, pending_ids: [], catchup: 0,
           judged: 0, judged_bound: 0 };
}

export function close(spec) {
  return { state: spec.state, catchup: 0 };
}
