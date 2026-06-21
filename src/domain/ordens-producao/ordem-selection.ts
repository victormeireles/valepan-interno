export function moveIdsToTop(
  allIds: readonly string[],
  selectedIds: readonly string[],
): string[] {
  const selectedSet = new Set(selectedIds);
  const selected = allIds.filter((id) => selectedSet.has(id));
  const rest = allIds.filter((id) => !selectedSet.has(id));
  return [...selected, ...rest];
}

export function moveIdsToBottom(
  allIds: readonly string[],
  selectedIds: readonly string[],
): string[] {
  const selectedSet = new Set(selectedIds);
  const rest = allIds.filter((id) => !selectedSet.has(id));
  const selected = allIds.filter((id) => selectedSet.has(id));
  return [...rest, ...selected];
}

export function areAllIdsSelected(
  allIds: readonly string[],
  selectedIds: ReadonlySet<string>,
): boolean {
  return allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
}

export function toggleIdInSelection(
  selectedIds: ReadonlySet<string>,
  id: string,
): Set<string> {
  const next = new Set(selectedIds);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}
