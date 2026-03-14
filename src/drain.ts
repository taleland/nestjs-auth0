export const drain = async <T>(
  fetchPage: (params: { page: number; per_page: number }) => Promise<{ data: T[] }>,
  options: { perPage?: number } = {}
): Promise<T[]> => {
  const perPage = options.perPage ?? 100;
  const all: T[] = [];
  let page = 0;

  for (;;) {
    const result = await fetchPage({ page, per_page: perPage });
    all.push(...result.data);
    if (result.data.length < perPage) {
      break;
    }
    page += 1;
  }

  return all;
};

export async function * drainIterator<T>(
  fetchPage: (params: { page: number; per_page: number }) => Promise<{ data: T[] }>,
  options: { perPage?: number } = {}
): AsyncGenerator<T> {
  const perPage = options.perPage ?? 100;
  let page = 0;

  for (;;) {
    const result = await fetchPage({ page, per_page: perPage });

    for (const item of result.data) {
      yield item;
    }

    if (result.data.length < perPage) {
      break;
    }

    page += 1;
  }
}
