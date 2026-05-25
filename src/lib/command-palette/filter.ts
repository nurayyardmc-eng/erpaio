/**
 * Pure helpers for the ⌘K command palette.
 *
 * Extracted (Track PPPPP) from src/components/CommandPalette.tsx so the
 * substring matcher + group bucketing can be tested independently of the
 * React component (which is hard to mount in a JSDom-free vitest setup).
 *
 * Generic over the command shape — caller defines the Command interface.
 */
export interface PaletteCommand {
  id: string;
  label: string;
  group: string;
}

/**
 * Case-insensitive substring match. Empty query → all commands pass
 * through (palette default state).
 */
export function filterCommands<T extends PaletteCommand>(
  commands: T[],
  query: string,
): T[] {
  const needle = query.toLowerCase();
  return commands.filter((c) => c.label.toLowerCase().includes(needle));
}

/**
 * Bucket commands by their `group` field. Preserves insertion order of both
 * groups (first appearance) and items within a group.
 */
export function groupByCategory<T extends PaletteCommand>(
  commands: T[],
): Record<string, T[]> {
  return commands.reduce<Record<string, T[]>>((acc, c) => {
    (acc[c.group] = acc[c.group] || []).push(c);
    return acc;
  }, {});
}
