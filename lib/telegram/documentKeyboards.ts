import { SUBJECTS, DOC_TYPES } from "@/lib/router/classifyDocument";

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size) as T[]);
  }
  return out;
}

export function subjectKeyboard(pendingId: string) {
  return {
    inline_keyboard: chunk(
      SUBJECTS.map((s) => ({ text: s, callback_data: `docsubj:${pendingId}:${s}` })),
      2
    ),
  };
}

export function docTypeKeyboard(pendingId: string) {
  return {
    inline_keyboard: chunk(
      DOC_TYPES.map((d) => ({ text: d, callback_data: `doctype:${pendingId}:${d}` })),
      2
    ),
  };
}
