import { z } from "zod";

export const TRANSACTION_TYPES = ["expense", "income", "bill", "savings", "debt_payment"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

const classificationSchema = z.object({
  is_transaction: z.boolean(),
  type: z.enum(TRANSACTION_TYPES).nullable(),
  amount: z.number().nullable(),
  category: z.string().nullable(),
  account: z.string().nullable(),
  description: z.string(),
});

export type TransactionClassification = z.infer<typeof classificationSchema>;

const FALLBACK: TransactionClassification = {
  is_transaction: false,
  type: null,
  amount: null,
  category: null,
  account: null,
  description: "",
};

export async function classifyTransaction(
  text: string,
  categoryNames: string[],
  accountNames: string[]
): Promise<TransactionClassification> {
  const systemPrompt = `You detect and classify personal financial transactions from a short message.

The user's existing categories: ${categoryNames.join(", ") || "(none set up yet)"}
The user's existing accounts: ${accountNames.join(", ") || "(none set up yet)"}

Return JSON only:
{
  "is_transaction": boolean,
  "type": "expense" | "income" | "bill" | "savings" | "debt_payment" | null,
  "amount": number | null,
  "category": string | null,
  "account": string | null,
  "description": string
}

Rules:
- is_transaction is true only if the message describes money moving -- spending, receiving, paying a bill, saving, or paying down a debt. A task, reminder, or unrelated note is false, with every other field null and description "".
- type: "expense" for general spending, "income" for money received, "bill" for a recurring/fixed payment, "savings" for money moved into savings/investment, "debt_payment" for paying down a debt.
- amount is the positive number mentioned (never invent one; if is_transaction is true but no amount was stated, use null).
- category MUST be exactly one of the listed category names (case-sensitive match), chosen for best fit. Use null only if none of the listed categories clearly fits -- this is expected to happen sometimes and is fine, it will be asked about afterward.
- account MUST be exactly one of the listed account names, and ONLY if the message clearly names or clearly implies one specific account. Use null if no account was mentioned at all -- do not guess.
- description is a short (2-5 word) human-readable note of what the transaction was for, e.g. "Panipuri", "monthly rent", "from daddy".
- Never invent an amount, category, or account that wasn't stated or clearly implied.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: "user", content: text }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    const rawText = data.content?.[0]?.text;
    if (typeof rawText !== "string") {
      throw new Error("No text content in Anthropic response");
    }

    const parsed = JSON.parse(rawText);
    const result = classificationSchema.parse(parsed);

    // Guard against the model returning a category/account that isn't
    // actually in the list it was given -- treat as unmatched rather than
    // trusting a hallucinated name into the disambiguation flow.
    if (result.category && !categoryNames.includes(result.category)) {
      result.category = null;
    }
    if (result.account && !accountNames.includes(result.account)) {
      result.account = null;
    }

    return result;
  } catch (err) {
    console.error("Transaction classification failed:", err);
    return FALLBACK;
  }
}
