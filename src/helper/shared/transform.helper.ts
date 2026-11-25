export function trimStringInput(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
