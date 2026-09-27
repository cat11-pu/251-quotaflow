// flowrun.js：按预算处理一批事件并回收取消账
import { occupancyOf, canFit } from "./quota.js";

function makeError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

// 跨轮状态：running 在跑任务（task -> cost）、done 完成序列、
// cancelled 取消但尚未回收的账、swept 已回收序列、applied 已处理事件 id。
function cloneState(state) {
  const src = state || {};
  return {
    running: Object.assign({}, src.running || {}),
    done: (src.done || []).slice(),
    cancelled: (src.cancelled || []).slice(),
    swept: (src.swept || []).slice(),
    applied: (src.applied || []).slice()
  };
}

function validateEvent(event) {
  if (!event || typeof event !== "object") {
    throw makeError("E_BAD_EVENT", "事件必须是对象");
  }
  if (event.id === null || event.id === undefined || event.task === null || event.task === undefined) {
    throw makeError("E_BAD_EVENT", "事件缺少 id 或 task");
  }
  if (event.kind !== "start" && event.kind !== "finish" && event.kind !== "cancel") {
    throw makeError("E_BAD_EVENT", "不认识的事件 kind：" + event.kind);
  }
  if (event.kind === "start") {
    const cost = Number(event.cost);
    if (!Number.isFinite(cost) || cost < 0) {
      throw makeError("E_BAD_EVENT", "start 事件的 cost 不合法");
    }
  }
}

// 按预算回收取消集合：每回收一条花一份预算，用尽后剩余的压在账上。
// 返回本轮回收条数。
function sweep(state, budget) {
  let count = 0;
  while (count < budget && state.cancelled.length > 0) {
    state.swept.push(state.cancelled.shift());
    count += 1;
  }
  return count;
}

export function step(spec) {
  const state = cloneState(spec.state);
  const events = Array.isArray(spec.events) ? spec.events : [];
  const capacity = Number(spec.capacity) || 0;
  let budget = Math.max(0, Math.floor(Number(spec.budget)) || 0);

  let sweptCount = 0;
  let dupStart = 0;
  let judged = 0;

  events.forEach(function (event) {
    validateEvent(event);
    // 同一条事件跨轮不重复处理。
    if (state.applied.indexOf(event.id) !== -1) {
      return;
    }
    state.applied.push(event.id);
    judged += 1;

    if (event.kind === "start") {
      const cost = Number(event.cost);
      const settled =
        state.done.indexOf(event.task) !== -1 || state.cancelled.indexOf(event.task) !== -1;
      if (settled) {
        // 已落定的任务再启动算重复启动，不占用配额。
        dupStart += 1;
      } else if (!canFit(state.running, cost, capacity)) {
        throw makeError("E_OVER_QUOTA",
          "任务 " + event.task + " 启动将使占用超过配额上限 " + capacity);
      } else {
        state.running[event.task] = cost;
      }
    } else if (event.kind === "finish") {
      if (!Object.prototype.hasOwnProperty.call(state.running, event.task)) {
        throw makeError("E_UNKNOWN_TASK", "完成的任务不在运行集合：" + event.task);
      }
      delete state.running[event.task];
      state.done.push(event.task);
    } else {
      if (!Object.prototype.hasOwnProperty.call(state.running, event.task)) {
        throw makeError("E_UNKNOWN_TASK", "取消的任务不在运行集合：" + event.task);
      }
      // 先记下取消，再按预算回收；回收过的才算交还命名空间。
      delete state.running[event.task];
      state.cancelled.push(event.task);
    }

    // 每次事件后按共享预算回收取消账，用尽后压账带入下一轮。
    const sweptNow = sweep(state, budget);
    sweptCount += sweptNow;
    budget -= sweptNow;
  });

  // 收尾前仍压在账上的取消任务（带入下一轮或等收尾补齐）。
  const pendingBefore = state.cancelled.length;
  const pendingIds = state.cancelled.slice();
  return {
    state: state,
    running: state.running,
    done: state.done,
    cancelled: state.cancelled,
    swept: state.swept,
    swept_count: sweptCount,
    dup_start: dupStart,
    occupancy: occupancyOf(state.running),
    pending_before: pendingBefore,
    pending_ids: pendingIds,
    catchup: 0,
    judged: judged,
    judged_bound: events.length
  };
}

// 收尾：不限预算，把取消账全部回收，返回补齐条数。
export function close(spec) {
  const state = cloneState(spec.state);
  const catchup = sweep(state, Number.POSITIVE_INFINITY);
  return { state: state, catchup: catchup };
}
