// app.js：渲染结果
import { occupancyOf, canFit } from "./quota.js";
import { step, close } from "./flowrun.js";

export function render(spec) {
  const events = spec.events || [];
  const half = Math.ceil(events.length / 2);
  const first = step(spec);
  const closed = close(Object.assign({}, spec, { state: first.state }));
  const r1 = step(Object.assign({}, spec, { events: events.slice(0, half) }));
  const r2 = step(Object.assign({}, spec, { state: r1.state, events: events.slice(half) }));
  const closedTwo = close(Object.assign({}, spec, { state: r2.state }));
  const replay = step(Object.assign({}, spec, { state: closed.state }));
  const wide = step(Object.assign({}, spec, { budget: spec.budget + 2 }));
  const full = step(Object.assign({}, spec, { events: events }));
  const fullClosed = close(Object.assign({}, spec, { state: full.state }));
  const fingerprint = function (state) {
    return JSON.stringify({ running: state.running, done: state.done, cancelled: state.cancelled,
                            swept: state.swept, applied: state.applied.length });
  };
  return { running: closed.state.running, done: closed.state.done, cancelled: closed.state.cancelled,
           swept: closed.state.swept, swept_count: first.swept_count, dup_start: first.dup_start,
           occupancy: first.occupancy, pending_before: first.pending_before,
           pending_ids: first.pending_ids, catchup: closed.catchup,
           budget_pair_differs: first.swept_count !== wide.swept_count,
           two_round_mid_differs: fingerprint(r2.state) !== fingerprint(first.state),
           two_round_closed_equal: fingerprint(closedTwo.state) === fingerprint(closed.state),
           replay_new: replay.swept_count, judged: first.judged, judged_bound: first.judged_bound,
           full_diff: fingerprint(closed.state) === fingerprint(fullClosed.state) ? 0 : 1,
           count: events.length, tail: canFit({}, 1, 1) ? 1 : 0 };
}
