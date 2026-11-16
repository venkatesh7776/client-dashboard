import { FilterBar } from "@/components/filter-bar";
import { MonthlyIncomeList } from "@/components/income";
import { AddPaymentButton } from "@/components/panels";
import { PaymentsTable } from "@/components/payments-table";
import { Empty, PageHeader, Section } from "@/components/ui";
import { PAYMENT_MODES } from "@/lib/constants";
import { getClientOptions, getIncomeYears, getMonthlyIncome, getPayments } from "@/lib/data";
import { monthLabel, todayIST } from "@/lib/dates";
import { inr } from "@/lib/format";

type SP = Promise<Record<string, string | undefined>>;

export default async function PaymentsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const year = Number(sp.year) || Number(todayIST().slice(0, 4));
  const [months, years, allMonths, payments, options, allClients] = await Promise.all([
    getMonthlyIncome(year),
    getIncomeYears(),
    getMonthlyIncome(),
    getPayments({ q: sp.q, client: sp.client, month: sp.month, mode: sp.mode }),
    getClientOptions("notLost"),
    getClientOptions("all"),
  ]);
  const shownTotal = payments.reduce((s, p) => s + Number(p.amount), 0);
  const filtered = !!(sp.q || sp.client || sp.month || sp.mode);

  return (
    <>
      <PageHeader
        title="Payments"
        description={`${inr(allMonths.find((m) => m.month === todayIST().slice(0, 8) + "01")?.total ?? 0)} received this month · ${inr(months.reduce((s, m) => s + m.total, 0))} in ${year}`}
        actions={<AddPaymentButton clientOptions={options} />} />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_minmax(0,380px)]">
        <Section
          title="All payments"
          action={filtered && <span className="tabular text-[13px] text-muted">{payments.length} shown · {inr(shownTotal)}</span>}
        >
          <div className="px-5 pt-3">
            <FilterBar
              search="Search client or Client ID"
              filters={[
                { key: "client", label: "Client", options: allClients.map((o) => ({ value: o.label.split(" · ")[0], label: o.label })) },
                { key: "month", label: "Month", options: allMonths.map((m) => ({ value: m.month, label: monthLabel(m.month) })) },
                { key: "mode", label: "Mode", options: [...PAYMENT_MODES] },
              ]}
            />
          </div>
          {payments.length === 0 ? (
            <Empty
              message={filtered ? "No payments match these filters." : "No payments yet."}
              action={!filtered && <AddPaymentButton clientOptions={options} label="Add payment" urlDriven={false} />}
            />
          ) : (
            <div className="pb-1">
              <PaymentsTable payments={payments} clientOptions={options} bare />
              {payments.length >= 300 && <p className="px-5 py-3 text-[12.5px] text-faint">Showing the latest 300. Use filters to narrow down.</p>}
            </div>
          )}
        </Section>
        <Section title="Monthly income">
          <MonthlyIncomeList rows={months} year={year} years={years} />
        </Section>

      </div>
    </>
  );
}
