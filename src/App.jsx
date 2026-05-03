import React, { useMemo, useState } from "react";
import {
  WalletCards,
  Plane,
  BarChart3,
  Images,
  Users,
  Menu,
  ChevronDown
} from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

import trips from "./data/trips.json";
import baseExpenses from "./data/expenses.json";
import memories from "./data/memories.json";
import paymentConfig from "./data/paymentConfig.json";
import receiptConfig from "./data/receiptConfig.json";
import paymentStatus from "./data/paymentStatus.json";

const tabs = [
  { id: "trips", label: "Trips", shortLabel: "Trips", icon: Plane, description: "Latest trips appear first." },
  { id: "contributions", label: "Contributions", shortLabel: "Money", icon: WalletCards, description: "See total spend, who paid, who still owes, and who should receive." },
  { id: "dashboard", label: "Dashboard", shortLabel: "Stats", icon: BarChart3, description: "Track spending patterns, biggest expenses, categories, and trip highlights." },
  { id: "memories", label: "Memories", shortLabel: "Media", icon: Images, description: "Photos, videos and reviews." }
];

const money = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0
});

const chartColors = ["#34d399", "#38bdf8", "#a78bfa", "#fbbf24", "#fb7185", "#2dd4bf"];

function getTripExpenses(allExpenses, tripId) {
  return allExpenses.filter((expense) => expense.tripId === tripId);
}

function getTripTotal(expenses) {
  return expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
}

function getPeople(expenses) {
  return Array.from(
    new Set(
      expenses.flatMap((expense) => [
        expense.paidBy,
        ...(expense.shares || []).map((share) => share.name)
      ])
    )
  ).filter(Boolean);
}

function getBalances(expenses, payments = [], tripId) {
  const people = getPeople(expenses);

  return people.map((person) => {
    const share = expenses.reduce((sum, expense) => {
      const personShare = (expense.shares || []).find((s) => s.name === person);
      return sum + Number(personShare?.amount || 0);
    }, 0);

    const paid = payments
      .filter((p) => p.tripId === tripId && p.from === person)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const baseAbono = expenses.reduce((sum, expense) => {
      if (expense.paidBy !== person) return sum;

      return sum + (expense.shares || [])
        .filter((s) => s.name !== person)
        .reduce((ss, s) => ss + Number(s.amount || 0), 0);
    }, 0);

    const paymentsReceived = payments
      .filter((p) => p.tripId === tripId && p.to === person)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const baseUtang = expenses.reduce((sum, expense) => {
      if (expense.paidBy === person) return sum;

      const personShare = (expense.shares || []).find((s) => s.name === person);
      return sum + Number(personShare?.amount || 0);
    }, 0);

    const abono = Math.max(baseAbono - paymentsReceived, 0);
    const utang = Math.max(baseUtang - paid, 0);

    return { person, share, paid, abono, utang };
  });
}

function computeSettlements(balances) {
  const creditors = balances
    .filter((b) => b.balance > 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.balance - a.balance);

  const debtors = balances
    .filter((b) => b.balance < 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  const settlements = [];

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(Math.abs(debtor.balance), creditor.balance);

    if (amount > 0) {
      settlements.push({
        from: debtor.person,
        to: creditor.person,
        amount
      });
    }

    debtor.balance += amount;
    creditor.balance -= amount;

    if (Math.abs(debtor.balance) < 1) i++;
    if (creditor.balance < 1) j++;
  }

  return settlements;
}

function TripSelector({ selectedTripId, setSelectedTripId }) {
  return (
    <div className="relative">
      <select
        value={selectedTripId}
        onChange={(e) => setSelectedTripId(e.target.value)}
        className="appearance-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 pr-10 text-sm text-white outline-none transition hover:bg-slate-900"
      >
        {trips.map((trip) => (
          <option key={trip.id} value={trip.id}>
            {trip.name}
          </option>
        ))}
      </select>

      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
        <ChevronDown size={18} />
      </div>
    </div>
  );
}

function MetricCard({ label, value, note }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      {note && <p className="mt-2 text-sm text-slate-500">{note}</p>}
    </div>
  );
}

function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20">
            <Users size={23} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Ambagan</h1>
            <p className="text-xs text-slate-400">Trip & Gastos Tracker</p>
          </div>
        </div>

        <button className="hidden rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 md:block">
          Add Trip Soon
        </button>

        <button className="rounded-2xl border border-white/10 p-2 text-slate-300 md:hidden">
          <Menu size={20} />
        </button>
      </div>
    </header>
  );
}

function DesktopTabs({ activeTab, setActiveTab }) {
  return (
    <nav className="hidden rounded-3xl border border-white/10 bg-white/[0.04] p-2 shadow-2xl shadow-black/20 md:grid md:grid-cols-4 md:gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative overflow-hidden rounded-2xl px-4 py-4 text-left transition ${active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
          >
            <div className="relative z-10 flex items-center gap-3">
              <Icon size={20} />
              <div>
                <div className="font-semibold">{tab.label}</div>
                <div className={`text-xs ${active ? "text-slate-600" : "text-slate-500"}`}>
                  {tab.shortLabel}
                </div>
              </div>
            </div>

            {active && (
              <motion.div
                layoutId="activeTabGlow"
                className="absolute inset-0 bg-gradient-to-br from-white via-emerald-50 to-cyan-50"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

function MobileTabs({ activeTab, setActiveTab }) {
  return (
    <nav className="fixed bottom-3 left-1/2 z-40 grid w-[calc(100%-24px)] max-w-md -translate-x-1/2 grid-cols-4 rounded-3xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl md:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs transition ${active ? "bg-emerald-400 text-slate-950" : "text-slate-400"
              }`}
          >
            <Icon size={19} />
            <span>{tab.shortLabel}</span>
          </button>
        );
      })}
    </nav>
  );
}

function PageIntro({ activeTab }) {
  const tab = tabs.find((item) => item.id === activeTab);
  const Icon = tab.icon;

  return (
    <motion.section
      key={activeTab}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-6 shadow-2xl shadow-black/20"
    >
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200">
        <Icon size={16} />
        Current Tab
      </div>
      <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{tab.label}</h2>
      <p className="mt-2 max-w-2xl text-slate-400">{tab.description}</p>
    </motion.section>
  );
}

function TripsPage({ allExpenses }) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {trips.map((trip) => {
        const tripExpenses = getTripExpenses(allExpenses, trip.id);

        return (
          <article key={trip.id} className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 transition hover:-translate-y-1 hover:bg-white/[0.07]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">{trip.name}</h3>
                <p className="text-sm text-slate-400">{trip.location}</p>
              </div>

              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${trip.status === "Settled" ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-200"}`}>
                {trip.status}
              </span>
            </div>

            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span>Date</span>
                <span className="text-white">{trip.date}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span>Total Spend</span>
                <span className="font-semibold text-white">{money.format(getTripTotal(tripExpenses))}</span>
              </div>
              <div className="flex justify-between">
                <span>People</span>
                <span className="text-white">{getPeople(tripExpenses).length}</span>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function AddExpenseForm({ selectedTripId, addExpense }) {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Food");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [sharedBy, setSharedBy] = useState("");

  function handleSubmit(e) {
    e.preventDefault();

    const numericAmount = Number(amount);

    if (!description.trim() || !numericAmount || numericAmount <= 0 || !paidBy.trim() || !sharedBy.trim()) {
      alert("Please complete all fields. Amount must be greater than 0.");
      return;
    }

    addExpense({
      id: crypto.randomUUID(),
      tripId: selectedTripId,
      category,
      description: description.trim(),
      amount: numericAmount,
      paidBy: paidBy.trim(),
      sharedBy: sharedBy
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
    });

    setDescription("");
    setCategory("Food");
    setAmount("");
    setPaidBy("");
    setSharedBy("");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <h4 className="text-lg font-bold text-white">Add Expense</h4>
      <p className="mt-1 text-sm text-slate-400">Saved locally in this browser for now.</p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description e.g. Lunch sa cafe" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="1" placeholder="Amount" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />

        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none">
          <option>Food</option>
          <option>Transport</option>
          <option>Accommodation</option>
          <option>Activities</option>
          <option>Damages</option>
          <option>Others</option>
        </select>

        <input value={paidBy} onChange={(e) => setPaidBy(e.target.value)} placeholder="Paid by e.g. King" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
        <input value={sharedBy} onChange={(e) => setSharedBy(e.target.value)} placeholder="Shared by e.g. King, Jasper, Claire" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none md:col-span-2" />
      </div>

      <button type="submit" className="mt-5 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300">
        Save Expense
      </button>
    </form>
  );
}
function PaymentAccess() {
  return (
    <div className="mt-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-6 shadow-lg shadow-black/20">

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div>
          <h4 className="text-lg font-bold text-white">
            Payment QR Vault
          </h4>
          <p className="mt-1 text-sm text-slate-400 max-w-md">
            Everyone’s QR codes are stored in a shared folder.
            Access may require approval as it contains personal payment details.
          </p>
        </div>

        <a
          href={`https://drive.google.com/drive/folders/${paymentConfig.driveFolderId}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
        >
          Open QR Vault →
        </a>

      </div>
    </div>
  );
}

function ReceiptAccess() {
  return (
    <div className="mt-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-6 shadow-lg shadow-black/20">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h4 className="text-lg font-bold text-white">Actual Receipts</h4>
          <p className="mt-1 max-w-md text-sm text-slate-400">
            Official receipts and proof of expenses are stored in a shared Drive folder.
          </p>
        </div>

        <a
          href={`https://drive.google.com/drive/folders/${receiptConfig.driveFolderId}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
        >
          Open Receipts →
        </a>
      </div>
    </div>
  );
}

function applyPaymentsToBalances(balances, payments, tripId) {
  return balances.map((row) => {
    const sentPayments = payments
      .filter((p) => p.tripId === tripId && p.from === row.person)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const receivedPayments = payments
      .filter((p) => p.tripId === tripId && p.to === row.person)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const adjustedBalance =
      row.balance < 0
        ? row.balance + sentPayments
        : row.balance - receivedPayments;

    return {
      ...row,
      paid: row.paid,
      share: row.share,
      balance: adjustedBalance
    };
  });
}

function ExpenseBreakdown({ tripExpenses }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h4 className="text-lg font-bold text-white">Expense Breakdown</h4>
          <p className="mt-1 text-sm text-slate-400">
            Detailed share per person based on actual orders/items.
          </p>
        </div>

        <span className="rounded-xl border border-white/10 px-3 py-1 text-sm text-slate-300">
          {isOpen ? "Hide" : "Show"}
        </span>
      </button>

      {isOpen && (
        <div className="mt-5 space-y-4">
          {tripExpenses.map((expense, index) => (
            <div
              key={`${expense.description}-${index}`}
              className="rounded-3xl border border-white/10 bg-slate-950/40 p-5"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h5 className="font-bold text-white">{expense.description}</h5>
                  <p className="text-sm text-slate-400">
                    {expense.category} • Paid by {expense.paidBy}
                  </p>
                </div>

                <span className="font-bold text-emerald-300">
                  {money.format(expense.amount)}
                </span>
              </div>

              <div className="mt-4 w-full overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full min-w-[600px] whitespace-nowrap text-left text-sm">
                  <thead className="bg-white/[0.06] text-slate-300">
                    <tr>
                      <th className="sticky left-0 z-20 bg-slate-900 px-4 py-3">Friend</th>
                      <th className="px-4 py-3">Breakdown</th>
                      <th className="px-4 py-3">Share</th>
                    </tr>
                  </thead>

                  <tbody>
                    {(expense.shares || []).map((share) => (
                      <tr key={share.name} className="border-t border-white/10 text-slate-300">
                        <td className="sticky left-0 z-10 bg-slate-950 px-4 py-3 font-semibold text-white">
                          {share.name}
                        </td>

                        <td className="px-4 py-3">
                          {share.breakdown ? (
                            <div className="space-y-1">
                              {Object.entries(share.breakdown)
                                .filter(([, value]) => value)
                                .map(([label, value]) => (
                                  <p key={label}>
                                    <span className="text-slate-500">{label}: </span>
                                    {value}
                                  </p>
                                ))}
                            </div>
                          ) : (
                            <span className="text-slate-500">No item breakdown</span>
                          )}
                        </td>

                        <td className="px-4 py-3 font-bold text-emerald-300">
                          {money.format(share.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function AdminPaymentForm({ selectedTripId, addPayment }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState("");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");

  function handleUnlock() {
    if (password === "thanks") {
      setIsUnlocked(true);
      setShowPrompt(false);
      setPassword("");
    } else {
      alert("Wrong password bruv 😆");
    }
  }

  function handleSubmit(e) {
    e.preventDefault();

    const numericAmount = Number(amount);

    if (!from.trim() || !to.trim() || !numericAmount || numericAmount <= 0) {
      alert("Complete all fields. Amount must be greater than 0.");
      return;
    }

    addPayment({
      id: crypto.randomUUID(),
      tripId: selectedTripId,
      from: from.trim(),
      to: to.trim(),
      amount: numericAmount
    });

    setFrom("");
    setTo("");
    setAmount("");
  }

  return (
    <div className="mt-6">
      <button
        onClick={() => setShowPrompt(true)}
        className="text-xs text-slate-700 hover:text-emerald-300"
      >
        •
      </button>

      {showPrompt && !isUnlocked && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950 p-4">
          <input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
          />

          <button
            onClick={handleUnlock}
            className="mt-3 w-full rounded-xl bg-emerald-400 px-3 py-2 text-sm font-bold text-slate-950"
          >
            Unlock
          </button>
        </div>
      )}

      {isUnlocked && (
        <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white">Record Local Payment</h4>

            <button
              onClick={() => setIsUnlocked(false)}
              className="text-xs text-slate-400 hover:text-rose-300"
              type="button"
            >
              Cancel ✕
            </button>
          </div>

          <p className="mt-1 text-sm text-slate-400">
            This updates balances only on this browser.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <input
                placeholder="From e.g. Dave"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
              />

              <input
                placeholder="To e.g. King"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
              />

              <input
                type="number"
                min="1"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
              />
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-300"
              >
                Save Payment
              </button>

              <button
                type="button"
                onClick={() => setIsUnlocked(false)}
                className="flex-1 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function computeDirectOwed(expenses) {
  const map = {};

  expenses.forEach((expense) => {
    const payer = expense.paidBy;

    (expense.shares || []).forEach((share) => {
      if (share.name === payer) return;

      const key = `${share.name}__${payer}`;

      if (!map[key]) {
        map[key] = {
          from: share.name,
          to: payer,
          amount: 0
        };
      }

      map[key].amount += Number(share.amount || 0);
    });
  });

  return Object.values(map).sort((a, b) => a.from.localeCompare(b.from));
}

function ContributionsPage({ allExpenses, addExpense, allPayments, addPayment }) {
  const [selectedTripId, setSelectedTripId] = useState(trips[0]?.id || "");
  const [filterFrom, setFilterFrom] = useState("All");
  const [filterTo, setFilterTo] = useState("All");
  const selectedTrip = trips.find((trip) => trip.id === selectedTripId);
  const tripExpenses = getTripExpenses(allExpenses, selectedTripId);

  const people = getPeople(tripExpenses);
  const rawBalances = getBalances(tripExpenses, allPayments, selectedTripId);

  const balances = rawBalances;

  const settlements = computeDirectOwed(tripExpenses);
  const settlementPeople = Array.from(
    new Set(settlements.flatMap((s) => [s.from, s.to]))
  ).sort();

  const filteredSettlements = settlements.filter((s) => {
    const fromMatch = filterFrom === "All" || s.from === filterFrom;
    const toMatch = filterTo === "All" || s.to === filterTo;
    return fromMatch && toMatch;
  });
  const tripPayments = allPayments.filter(
    (p) => p.tripId === selectedTripId
  );
  const totalSpend = getTripTotal(tripExpenses);

  const [adminMode, setAdminMode] = useState(false);

  const highestPaid = balances.length
    ? [...balances].sort((a, b) => b.paid - a.paid)[0].person
    : "None";

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Contribution Snapshot</h3>
          <p className="mt-2 text-slate-400">{selectedTrip?.name || "No trip selected"} — paid vs fair share breakdown.</p>
        </div>

        <TripSelector selectedTripId={selectedTripId} setSelectedTripId={setSelectedTripId} />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <MetricCard label="Total Spend" value={money.format(totalSpend)} />
        <MetricCard label="Total People" value={people.length} />
        <MetricCard label="Highest Paid" value={highestPaid} />
      </div>

      <div className="mt-6 w-full overflow-x-auto rounded-3xl border border-white/10">
        <table className="w-full min-w-[700px] whitespace-nowrap text-left text-sm">
          <thead className="bg-white/[0.06] text-slate-300">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-900 px-4 py-3">Friend</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Share</th>
              <th className="px-4 py-3">Abono</th>
              <th className="px-4 py-3">To Pay</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((row) => (
              <tr key={row.person} className="border-t border-white/10 text-slate-300">
                <td className="sticky left-0 z-10 bg-slate-950 px-4 py-3 font-semibold text-white">
                  {row.person}
                </td>
                <td className="px-4 py-3">{money.format(row.paid)}</td>
                <td className="px-4 py-3">{money.format(row.share)}</td>
                <td className="text-emerald-300">
                  {row.abono > 0 ? money.format(row.abono) : "-"}
                </td>

                <td className="text-rose-300">
                  {row.utang > 0 ? money.format(row.utang) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      <div className="mt-6 rounded-3xl border border-white/10 p-5">
        <h4 className="mb-3 text-lg font-bold text-white">Suggested Settlements</h4>
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <select
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="All">Who will pay: All</option>
            {settlementPeople.map((name) => (
              <option key={`from-${name}`} value={name}>
                Who will pay: {name}
              </option>
            ))}
          </select>

          <select
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="All">Who to pay: All</option>
            {settlementPeople.map((name) => (
              <option key={`to-${name}`} value={name}>
                Who to pay: {name}
              </option>
            ))}
          </select>
        </div>
        {filteredSettlements.length === 0 ? (
          <p className="text-slate-400">All settled. Walang utang. ✨</p>
        ) : (
          <div className="space-y-2">
            {filteredSettlements.map((s, index) => {
              const payments = tripPayments.filter(
                (p) =>
                  p.from === s.from &&
                  p.to === s.to
              );

              const totalPaid = payments.reduce(
                (sum, p) => sum + Number(p.amount || 0),
                0
              );

              let status = "Unpaid";

              if (totalPaid >= s.amount) status = "Paid";
              else if (totalPaid > 0) status = "Partial";

              return (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-xl bg-white/[0.05] px-4 py-3"
                >
                  <div>
                    <span className="text-slate-300">
                      {s.from} → {s.to}
                    </span>
                    <p
                      className={`text-xs font-semibold ${status === "Paid"
                        ? "text-emerald-300"
                        : status === "Partial"
                          ? "text-amber-300"
                          : "text-rose-300"
                        }`}
                    >
                      {status}
                    </p>
                  </div>

                  <span className="font-semibold text-emerald-300">
                    {money.format(s.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ExpenseBreakdown tripExpenses={tripExpenses} />


      <PaymentAccess />
      <ReceiptAccess />
      <AdminPaymentForm selectedTripId={selectedTripId} addPayment={addPayment} />


    </section>

  );
}

function DashboardPage({ allExpenses }) {
  const [selectedTripId, setSelectedTripId] = useState(trips[0]?.id || "");
  const selectedTrip = trips.find((trip) => trip.id === selectedTripId);
  const tripExpenses = getTripExpenses(allExpenses, selectedTripId);

  const totalSpend = getTripTotal(tripExpenses);

  const categoryData = Object.values(
    tripExpenses.reduce((acc, expense) => {
      acc[expense.category] ??= { name: expense.category, value: 0 };
      acc[expense.category].value += Number(expense.amount || 0);
      return acc;
    }, {})
  );

  const payerData = Object.values(
    tripExpenses.reduce((acc, expense) => {
      acc[expense.paidBy] ??= { name: expense.paidBy, amount: 0 };
      acc[expense.paidBy].amount += Number(expense.amount || 0);
      return acc;
    }, {})
  ).sort((a, b) => b.amount - a.amount);

  const biggestExpense = [...tripExpenses].sort((a, b) => b.amount - a.amount)[0];
  const topCategory = [...categoryData].sort((a, b) => b.value - a.value)[0];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Trip Dashboard</h3>
          <p className="mt-2 text-slate-400">{selectedTrip?.name || "No trip selected"} — gastos analytics and spending patterns.</p>
        </div>

        <TripSelector selectedTripId={selectedTripId} setSelectedTripId={setSelectedTripId} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Total Spend" value={money.format(totalSpend)} />
        <MetricCard label="Top Category" value={topCategory?.name || "None"} />
        <MetricCard label="Biggest Expense" value={biggestExpense ? money.format(biggestExpense.amount) : "₱0"} note={biggestExpense?.description} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
          <h4 className="mb-4 text-lg font-bold text-white">Spend by Category</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={95} label={({ name }) => name}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`category-${index}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => money.format(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
          <h4 className="mb-4 text-lg font-bold text-white">Paid by Friend</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payerData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => money.format(value)} />
                <Bar dataKey="amount" radius={[14, 14, 0, 0]}>
                  {payerData.map((entry, index) => (
                    <Cell key={`payer-${index}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}

function MemoriesPage() {
  const [selectedTripId, setSelectedTripId] = useState(trips[0]?.id || "");
  const selectedTrip = trips.find((trip) => trip.id === selectedTripId);
  const memory = memories.find((item) => item.tripId === selectedTripId);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Trip Memories</h3>
          <p className="mt-2 text-slate-400">{selectedTrip?.name || "No trip selected"} — photos, videos, reviews, and highlights.</p>
        </div>

        <TripSelector selectedTripId={selectedTripId} setSelectedTripId={setSelectedTripId} />
      </div>

      {memory ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Album" value={memory.title} />
            <MetricCard label="Rating" value={`${memory.rating}/5`} />
            <MetricCard label="Location" value={selectedTrip?.location || "N/A"} />
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
            <h4 className="text-lg font-bold text-white">Trip Review</h4>
            <p className="mt-2 text-slate-400">{memory.review}</p>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-black/30">
            <div className="flex flex-col gap-4 border-b border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
              <div>
                <h4 className="text-lg font-bold text-white">Google Drive Gallery</h4>
                <p className="mt-1 text-sm text-slate-400">Auto-updates when new photos or videos are added to Drive.</p>
              </div>

              <a href={`https://drive.google.com/drive/folders/${memory.driveFolderId}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">
                Open Drive
              </a>
            </div>

            <div className="relative p-3">
              <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.02]">
                <iframe title="Google Drive Gallery" src={`https://drive.google.com/embeddedfolderview?id=${memory.driveFolderId}#grid`} className="h-[620px] w-full" />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-[1.75rem] border border-dashed border-white/15 bg-white/[0.04] p-8 text-center">
          <p className="font-semibold text-white">No memories added yet.</p>
          <p className="mt-2 text-sm text-slate-500">Add this trip to memories.json with a Google Drive folder ID.</p>
        </div>
      )}
    </section>
  );
}

function ActivePage({ activeTab, allExpenses, addExpense, allPayments, addPayment }) {
  if (activeTab === "trips") return <TripsPage allExpenses={allExpenses} />;

  if (activeTab === "contributions") {
    return (
      <ContributionsPage
        allExpenses={allExpenses}
        addExpense={addExpense}
        allPayments={allPayments}
        addPayment={addPayment}
      />
    );
  }

  if (activeTab === "dashboard") return <DashboardPage allExpenses={allExpenses} />;

  return <MemoriesPage />;
}



export default function AmbaganApp() {
  const [activeTab, setActiveTab] = useState("trips");

  const [localExpenses, setLocalExpenses] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ambaganExpenses")) || [];
    } catch {
      return [];
    }
  });

  const allExpenses = useMemo(() => [...baseExpenses, ...localExpenses], [localExpenses]);

  const [localPayments, setLocalPayments] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ambaganPayments")) || [];
    } catch {
      return [];
    }
  });

  const allPayments = useMemo(
    () => [...paymentStatus, ...localPayments],
    [localPayments]
  );

  function addPayment(newPayment) {
    const updatedPayments = [...localPayments, newPayment];
    setLocalPayments(updatedPayments);
    localStorage.setItem("ambaganPayments", JSON.stringify(updatedPayments));
  }


  function addExpense(newExpense) {
    const updatedExpenses = [...localExpenses, newExpense];
    setLocalExpenses(updatedExpenses);
    localStorage.setItem("ambaganExpenses", JSON.stringify(updatedExpenses));
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-28 text-slate-100 md:pb-12">
      <div className="absolute inset-0 -z-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute bottom-20 right-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative z-10">
        <AppHeader />

        <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
          <DesktopTabs activeTab={activeTab} setActiveTab={setActiveTab} />
          <PageIntro activeTab={activeTab} />
          <ActivePage
            activeTab={activeTab}
            allExpenses={allExpenses}
            addExpense={addExpense}
            allPayments={allPayments}
            addPayment={addPayment}
          />
        </div>

        <MobileTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </main>
  );
}