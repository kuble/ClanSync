/** Read complete ranking inputs; an API cap or failed later page must not award a partial winner. */
export async function loadDashboardRows<T>(
  loadPage: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: unknown;
    count: number | null;
  }>,
): Promise<{ data: T[] | null; error: unknown; count: number | null }> {
  const rows: T[] = [];
  let expected: number | null = null;
  for (let from = 0; ; from += 500) {
    const page = await loadPage(from, from + 499);
    if (page.error) return { data: null, error: page.error, count: null };
    if (from === 0) expected = page.count;
    if (page.count !== expected)
      return { data: null, error: new Error("Ranking inputs changed during loading"), count: null };
    rows.push(...(page.data ?? []));
    if (!page.data || page.data.length < 500) {
      if (expected !== null && rows.length !== expected)
        return { data: null, error: new Error("Incomplete ranking inputs"), count: expected };
      return { data: rows, error: null, count: expected };
    }
  }
}
