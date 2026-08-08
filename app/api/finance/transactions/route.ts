import { NextRequest, NextResponse } from "next/server";
import { getRecentTransactions, createTransaction } from "@/lib/finance/panel";
import { TRANSACTION_TYPES, TransactionType } from "@/lib/finance/classify";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 30;

  const transactions = await getRecentTransactions(limit);
  return NextResponse.json({ transactions });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, amount, categoryId, accountId, description } = body;

  if (!TRANSACTION_TYPES.includes(type) || typeof amount !== "number" || !categoryId) {
    return NextResponse.json(
      { error: "type (valid transaction type), amount (number), and categoryId are required" },
      { status: 400 }
    );
  }

  const ok = await createTransaction({
    type: type as TransactionType,
    amount,
    categoryId,
    accountId: accountId ?? null,
    description: description ?? "",
  });

  if (!ok) {
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }

  const transactions = await getRecentTransactions();
  return NextResponse.json({ transactions }, { status: 201 });
}
