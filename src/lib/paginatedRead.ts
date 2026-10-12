export async function readEveryPage<T>(fetchPage: (from: number, to: number) => Promise<T[]>, size = 1000): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += size) {
    const page = await fetchPage(offset, offset + size - 1);
    rows.push(...page);
    if (page.length < size) return rows;
  }
}