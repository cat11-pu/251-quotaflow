// quota.js：占用与能不能放行
// running 是 task -> cost 的映射，占用即各在跑任务花费之和。
export function occupancyOf(running) {
  const map = running || {};
  return Object.keys(map).reduce(function (sum, key) {
    return sum + (Number(map[key]) || 0);
  }, 0);
}

// 占用加花费不超过上限才放得下。
export function canFit(running, cost, capacity) {
  return occupancyOf(running) + Number(cost) <= Number(capacity);
}
