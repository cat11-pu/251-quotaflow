// quota.js：占用与能不能放行
export function occupancyOf(running) {
  let total = 0;
  for (const key of Object.keys(running || {})) {
    const cost = Number(running[key]);
    if (Number.isFinite(cost)) total += cost;
  }
  return total;
}

export function canFit(running, cost, capacity) {
  return occupancyOf(running) + cost <= capacity;
}
