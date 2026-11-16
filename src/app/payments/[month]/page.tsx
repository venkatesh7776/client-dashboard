import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentsTable } from "@/components/payments-table";
import { Empty, Stat } from "@/components/ui";
import { getClientOptions, getPayments } from "@/lib/data";
import { addMonths, monthLabel } from "@/lib/dates";
import { inr } from "@/lib/format";

export default async function MonthPage({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) notFound();
  const first = `${month}-01`;
  const [payments, options] = await Promise.all([getPayments({ month: first }), getClientOptions("notLost")]);
  const total = payments.reduce((s, p) => s + Number(p.amount), 0);
  const prev = addMonths(first, -1).slice(0, 7);
  const next = addMonths(first, 1).slice(0, 7);

  return (
    <>
      <Link href="/payments" className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
        <ChevronLeft size={14} /> Payments
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">{monthLabel(first)}</h1>
        <div className="flex gap-1">
          <Link href={`/payments/${prev}`} className="rounded-md p-1.5 text-muted hover:bg-hover hover:text-fg" aria-label="Previous month">
            <ChevronLeft size={18} />
          </Link>
          <Link href={`/payments/${next}`} className="rounded-md p-1.5 text-muted hover:bg-hover hover:text-fg" aria-label="Next month">
            <ChevronRight size={18} />
          </Link>
        </div>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:max-w-md">
        <Stat label="Total received" value={inr(total)} />
        <Stat label="Payments" value={payments.length} />
      </div>
      {payments.length === 0 ? <Empty message="No payments this month." /> : <PaymentsTable payments={payments} clientOptions={options} />}
    </>
  );
}
