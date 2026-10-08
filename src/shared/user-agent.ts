// A small, readable approximation for display ("Chrome on macOS"), not a full User-Agent parser.
// Order matters: Edge and Opera also contain "Chrome", and Chrome also contains "Safari".

const BROWSERS: [RegExp, string][] = [
  [/Edg\//, "Edge"],
  [/OPR\//, "Opera"],
  [/Firefox\//, "Firefox"],
  [/Chrome\//, "Chrome"],
  [/Safari\//, "Safari"],
  [/^curl\//, "curl"],
];

const SYSTEMS: [RegExp, string][] = [
  [/iPhone|iPad/, "iOS"],
  [/Android/, "Android"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Windows/, "Windows"],
  [/Linux/, "Linux"],
];

const firstMatch = (value: string, patterns: [RegExp, string][]): string | undefined =>
  patterns.find(([pattern]) => pattern.test(value))?.[1];

export function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) {
    return "Unknown device";
  }
  const browser = firstMatch(userAgent, BROWSERS) ?? "Unknown browser";
  const system = firstMatch(userAgent, SYSTEMS);
  return system ? `${browser} on ${system}` : browser;
}
