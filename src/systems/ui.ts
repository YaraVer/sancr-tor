/** Безопасный доступ к строкам из data/ui.json. */
export function tr(data: Record<string, unknown>, path: string): string {
  let current: unknown = data;
  for (const part of path.split('.')) {
    if (!current || typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : path;
}
