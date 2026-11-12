// Shared navigation data for the dashboard header nav.
// Item order and icons are the single source of truth for the top navigation.

export const MEDIA_PROVIDER_KINDS_VISIBLE = [
  "systemone",
];

export const managementNavItems = [
  { href: "/dashboard/endpoint", label: "Endpoint", icon: "api" },
  { href: "/dashboard/providers", label: "Providers", icon: "dns" },
  { href: "/dashboard/combos", label: "Combos", icon: "layers" },
  { href: "/dashboard/cli-tools", label: "CLI", icon: "terminal" },
];

export const monitoringNavItems = [
  { href: "/dashboard/usage", label: "Usage", icon: "bar_chart" },
  { href: "/dashboard/api-key-usage", label: "Key Usage", icon: "key" },
  { href: "/dashboard/quota", label: "Quota", icon: "data_usage" },
  { href: "/dashboard/token-saver", label: "Saver", icon: "savings" },
];

export const systemNavItems = [
  { href: "/dashboard/proxy-pools", label: "Proxies", icon: "lan" },
  { href: "/dashboard/skills", label: "Skills", icon: "extension" },
  { href: "/dashboard/prompt-injection", label: "Prompt", icon: "skull" },
  { href: "/dashboard/profile", label: "Settings", icon: "settings" },
];

export const debugNavItems = [
  { href: "/dashboard/console-log", label: "Logs", icon: "monitor" },
];
