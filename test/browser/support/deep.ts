// The output formatJson owes text nested in arrays alone, `[` repeated, a 1, `]` repeated: the
// outer 64 levels, MAX_DEPTH, each bracket on its line two spaces a level, and the levels below
// them kept as written on the line where they open. Written out here rather than read from
// formatJson, so a test that compares a view with it checks the formatter too.

/** `"[".repeat(depth) + "1" + "]".repeat(depth)` as formatJson formats it. */
export function deepFormatted(depth: number): string {
  const formatted = Math.min(depth, 64);
  const kept = depth - formatted;
  const indent = (level: number): string => "  ".repeat(level);
  const opening = Array.from({ length: formatted }, (_, level) => `${indent(level)}[`);
  const closing = Array.from(
    { length: formatted },
    (_, level) => `${indent(formatted - 1 - level)}]`,
  );
  const inner = `${indent(formatted)}${"[".repeat(kept)}1${"]".repeat(kept)}`;
  return [...opening, inner, ...closing].join("\n");
}
