import { FinanceCategory } from "@/lib/finance/panel";

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size) as T[]);
  }
  return out;
}

export function categoryKeyboard(pendingId: string, categories: FinanceCategory[]) {
  return {
    inline_keyboard: chunk(
      categories.map((c) => ({ text: c.name, callback_data: `fincat:${pendingId}:${c.name}` })),
      2
    ),
  };
}
