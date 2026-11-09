export const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "error", label: "Errors" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "none", label: "No connection" },
];

// noAuth providers (e.g. free proxies) are always usable even though they
// never have a stored connection record, so they never fall into "none".
export function getConnectionStatus(stats, isNoAuth = false) {
  if (isNoAuth) return "active";
  if (!stats || stats.total === 0) return "none";
  return stats.allDisabled ? "inactive" : "active";
}

export function matchesStatusFilter(statusFilter, stats, isNoAuth = false) {
  if (statusFilter === "all") return true;
  if (statusFilter === "error") return (stats?.error || 0) > 0;
  return getConnectionStatus(stats, isNoAuth) === statusFilter;
}
