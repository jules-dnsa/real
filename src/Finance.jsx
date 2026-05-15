import { useState, useEffect, useReducer, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "drive-zero-v1";

const CATEGORIES = [
  { id: "truck",         label: "Truck Payment",  color: "#00c896", emoji: "🚛" },
  { id: "housing",       label: "Housing/Rent",   color: "#60a5fa", emoji: "🏠" },
  { id: "utilities",     label: "Utilities",      color: "#a78bfa", emoji: "⚡" },
  { id: "groceries",     label: "Groceries",      color: "#34d399", emoji: "🛒" },
  { id: "gas",           label: "Gas/Fuel",       color: "#fbbf24", emoji: "⛽" },
  { id: "subscriptions", label: "Subscriptions",  color: "#f87171", emoji: "📱" },
  { id: "dining",        label: "Dining Out",     color: "#fb923c", emoji: "🍔" },
  { id: "insurance",     label: "Insurance",      color: "#94a3b8", emoji: "🛡️" },
  { id: "medical",       label: "Medical",        color: "#e879f9", emoji: "🏥" },
  { id: "income",        label: "Income",         color: "#00c896", emoji: "💰" },
  { id: "other",         label: "Other",          color: "#71717a", emoji: "📌" },
];

const BANK_GUIDES = [
  {
    name: "Chase",
    steps: [
      "Sign in at chase.com",
      "Click the account you want to export",
      "Click 'Download account activity' (top right area)",
      "Choose a date range (up to 1 year back)",
      "Select 'CSV' as the file type",
      "Click Download — file saves to your device",
    ],
  },
  {
    name: "Bank of America",
    steps: [
      "Sign in at bankofamerica.com",
      "Click your checking or savings account",
      "Click 'Download' near the transaction list",
      "Select 'Comma delimited (CSV)' format",
      "Pick your date range → click Download",
    ],
  },
  {
    name: "Wells Fargo",
    steps: [
      "Sign in at wellsfargo.com",
      "Click your account to open activity",
      "Click 'Download Account Activity' link",
      "Select your date range",
      "Choose 'Comma-Separated Values (CSV)' → Download",
    ],
  },
  {
    name: "Capital One",
    steps: [
      "Sign in at capitalone.com",
      "Open your account dashboard",
      "Click 'View All Transactions'",
      "Find 'Download Transactions' button",
      "Select 'CSV' format, choose dates → Download",
    ],
  },
  {
    name: "Citi",
    steps: [
      "Sign in at citi.com",
      "Open Account Details for your account",
      "Look for 'Download' button near transactions",
      "Select 'Spreadsheet (CSV)' format",
      "Choose date range → click Download",
    ],
  },
  {
    name: "USAA",
    steps: [
      "Sign in at usaa.com",
      "Select your bank account",
      "Scroll to Transaction History section",
      "Click the Download icon (arrow pointing down)",
      "Select 'CSV' format → Download",
    ],
  },
  {
    name: "Ally Bank",
    steps: [
      "Sign in at ally.com",
      "Go to your checking or savings account",
      "Click 'Statements & Documents' or look for Export",
      "Choose 'Export Transactions'",
      "Select date range, pick CSV → Download",
    ],
  },
  {
    name: "TD Bank",
    steps: [
      "Sign in at tdbank.com",
      "Select your account",
      "Click 'Download History' or 'Export'",
      "Set your date range",
      "Choose 'CSV' format → Download",
    ],
  },
  {
    name: "Other / Generic",
    steps: [
      "Look for 'Download', 'Export', or 'Statements' in your account",
      "Most banks list it under Account Activity or Transaction History",
      "Always choose CSV (comma-separated) over PDF or Excel when available",
      "Export at least 2–3 months for good pattern detection",
      "Contact your bank's support if you can't find the export option",
    ],
  },
];

const KEYWORD_MAP = {
  truck: [
    "toyota financial", "toyota motor", "ford motor credit", "gm financial",
    "chrysler capital", "ally auto", "santander auto", "capital one auto",
    "car payment", "auto loan", "auto payment", "truck payment",
  ],
  groceries: [
    "walmart", "kroger", "safeway", "albertsons", "publix", "trader joe",
    "whole foods", "aldi", "costco", "sam's club", "target grocery",
    "h-e-b", "heb", "meijer", "food lion", "wegmans", "sprouts",
  ],
  gas: [
    "shell", "exxon", "chevron", "bp", "circle k", "speedway", "7-eleven",
    "kwik trip", "pilot travel", "flying j", "loves travel", "wawa",
    "holiday station", "murphy usa", "mobil", "fuel", "gasoline",
  ],
  dining: [
    "mcdonald", "starbucks", "chipotle", "subway", "pizza", "doordash",
    "uber eats", "grubhub", "instacart delivery", "dunkin", "taco bell",
    "chick-fil-a", "wendy", "domino", "panera", "five guys", "restaurant",
    "dine", "cafe", "sushi", "burgers",
  ],
  subscriptions: [
    "netflix", "spotify", "hulu", "disney+", "apple.com/bill", "amazon prime",
    "youtube premium", "hbo max", "paramount+", "peacock", "gym membership",
    "planet fitness", "anytime fitness", "la fitness",
  ],
  utilities: [
    "electric", "power company", "water utility", "gas utility", "internet bill",
    "comcast", "xfinity", "at&t", "verizon wireless", "t-mobile", "sprint",
    "dish network", "directv", "spectrum",
  ],
  housing: [
    "rent", "mortgage", "hoa fees", "property tax", "apartment payment",
    "leasing office", "management company",
  ],
  insurance: [
    "insurance", "allstate", "state farm", "geico", "progressive",
    "liberty mutual", "nationwide insurance", "farmers insurance",
  ],
  medical: [
    "pharmacy", "cvs pharmacy", "walgreens", "rite aid",
    "doctor", "hospital", "dental", "vision", "urgent care",
    "quest diagnostics", "labcorp", "clinic",
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.abs(n));
}

function calcPayoff(balance, apr, monthly) {
  if (!balance || !apr || !monthly) return null;
  const r = apr / 100 / 12;
  if (monthly <= balance * r) return null;
  const months = Math.ceil(-Math.log(1 - (balance * r) / monthly) / Math.log(1 + r));
  const totalInterest = monthly * months - balance;
  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + months);
  return { months, totalInterest, totalPaid: monthly * months, payoffDate };
}

// Positive-amount transactions that are NOT income — peer transfers, ATM
// deposits, reversals, returned items, internal moves, etc.
const NON_INCOME_PATTERNS = [
  "zelle", "venmo", "cash app", "cashapp", "paypal",
  "atm deposit", "atm cash deposit",
  "return of posted", "returned item", "returned check",
  "fee reversal", "fee waiver", "credit adjustment", "debit adjustment",
  "transfer from", "online transfer from", "mobile transfer",
  "refund", "overdraft reversal", "chargeback",
];

function isTransfer(desc) {
  const d = desc.toLowerCase();
  return NON_INCOME_PATTERNS.some(p => d.includes(p));
}

// True income: payroll, direct deposit from an employer, government benefits
const INCOME_PATTERNS = [
  "direct deposit", "payroll", "salary", "adp", "paychex", "gusto",
  "intuit payroll", "square payroll", "tax refund", "irs treas",
  "social security", "ssi ", "unemployment",
];

function isRealIncome(desc) {
  const d = desc.toLowerCase();
  return INCOME_PATTERNS.some(p => d.includes(p));
}

function guessCategory(desc) {
  const d = desc.toLowerCase();
  for (const [cat, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some(kw => d.includes(kw))) return cat;
  }
  return "other";
}

function parseCSVLine(line) {
  const cells = [];
  let cur = "", inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === "," && !inQ) { cells.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

// Handles ISO (YYYY-MM-DD), MM/DD/YYYY, M/D/YY, MM-DD-YYYY
function parseDate(raw) {
  if (!raw) return null;
  const s = raw.trim();

  // Already ISO — parse as local date to avoid UTC offset shifting the day
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  // MM/DD/YYYY or M/D/YY
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    let [, m, d, y] = slashMatch.map(Number);
    if (y < 100) y += 2000;
    return new Date(y, m - 1, d);
  }

  // MM-DD-YYYY
  const dashMatch = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const [, m, d, y] = dashMatch.map(Number);
    return new Date(y, m - 1, d);
  }

  // Fallback — let the engine try
  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function isHeaderRow(normalized) {
  // A real header row contains "date" or "amount" as a key name
  return normalized.some(h => h === "date" || h === "amount" || h === "transactiondate" || h === "posteddate");
}

function csvToTransactions(text) {
  const allLines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (allLines.length < 2) return [];

  // Some banks (BoA, Citi) prepend account summary lines before the real headers.
  // Scan up to the first 15 lines to find the actual header row.
  let headerIdx = 0;
  for (let i = 0; i < Math.min(15, allLines.length - 1); i++) {
    const norm = parseCSVLine(allLines[i]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
    if (isHeaderRow(norm)) { headerIdx = i; break; }
  }

  const lines = allLines.slice(headerIdx);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

  const txs = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const row = Object.fromEntries(headers.map((h, j) => [h, vals[j] || ""]));
    const keys = Object.keys(row);

    // Date
    const dateKey = keys.find(k =>
      k === "date" || k === "transactiondate" || k === "posteddate" || k.startsWith("date")
    );
    const parsedDate = parseDate(row[dateKey] || "");
    if (!parsedDate) continue;
    const date = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}-${String(parsedDate.getDate()).padStart(2, "0")}`;

    // Description — BoA uses "description", Chase uses "description", WF uses column index
    const descKey = keys.find(k =>
      ["description", "descr", "name", "merchant", "memo", "payee", "details"].some(p => k.includes(p))
    );
    const description = (row[descKey] || row[keys[1]] || "Unknown").replace(/\s+/g, " ").trim().slice(0, 100);

    // Amount — handles debit/credit split columns OR single signed amount column
    let amount = 0, isIncome = false;
    const debitKey  = keys.find(k => k === "debit"  || k.includes("withdrawal") || k === "debitamount");
    const creditKey = keys.find(k => k === "credit" || k.includes("deposit")    || k === "creditamount");
    const amtKey    = keys.find(k => k === "amount" || k === "amt" || k === "transactionamount");

    const clean = v => parseFloat((v || "").replace(/[$, ]/g, "").replace(/[()]/g, "-")) || 0;

    if (debitKey && creditKey) {
      const cr = clean(row[creditKey]);
      const dr = clean(row[debitKey]);
      if (cr > 0) { amount = cr; isIncome = true; }
      else if (dr > 0) { amount = dr; isIncome = false; }
    } else if (amtKey) {
      const raw = clean(row[amtKey]);
      isIncome = raw > 0;
      amount = Math.abs(raw);
    }

    if (amount === 0) continue;

    // A positive amount isn't automatically income — Zelle, ATM deposits,
    // refunds, returns, and transfers are credits that aren't payroll.
    // Demote to "other" unless the description looks like real income.
    if (isIncome && (isTransfer(description) || !isRealIncome(description))) {
      // Only keep as income if it explicitly looks like payroll/deposit
      if (!isRealIncome(description)) isIncome = false;
    }

    txs.push({
      id: `csv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date,
      amount,
      description,
      category: isIncome ? "income" : guessCategory(description),
      isIncome,
      isRecurring: false,
      source: "csv",
    });
  }

  return txs.sort((a, b) => b.date.localeCompare(a.date));
}

function detectPatterns(transactions) {
  if (!transactions.length) return [];
  const groups = {};
  for (const tx of transactions) {
    const key = tx.description.toLowerCase().replace(/\d+/g, "#").trim().slice(0, 30);
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  }
  return Object.values(groups)
    .filter(g => g.length >= 2)
    .map(txs => {
      const days = txs.map(t => new Date(t.date).getDate());
      const avg = Math.round(days.reduce((a, b) => a + b, 0) / days.length);
      const variance = days.reduce((s, d) => s + Math.abs(d - avg), 0) / days.length;
      if (variance > 4) return null;
      const avgAmt = txs.reduce((s, t) => s + t.amount, 0) / txs.length;
      const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date));
      return {
        id: sorted[0].description.slice(0, 20),
        description: sorted[0].description,
        avgAmount: avgAmt,
        dayOfMonth: avg,
        category: sorted[0].category,
        occurrences: txs.length,
        lastDate: sorted[0].date,
        isIncome: sorted[0].isIncome,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.occurrences - a.occurrences);
}

function ordinal(n) {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

// Collapse "MCDONALD'S #1234 HOUSTON TX" → "MCDONALD'S"
function merchantName(description) {
  return description
    .replace(/\s+#\d+.*/i, "")
    .replace(/\s+\d{5,}.*/g, "")
    .replace(/\s+(TX|CA|NY|FL|GA|NC|VA|OH|MI|PA|NJ|MA|WA|OR|CO|AZ|IL|MN|WI|MO|TN|IN|KY|SC|OK|AL|UT|NV|NM|KS|AR|MS|IA|NE|ID|HI|NH|ME|RI|MT|DE|SD|ND|VT|WY|DC|AK)\b.*/i, "")
    .replace(/\s+\*+\d+.*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, 32);
}

// ─── State ────────────────────────────────────────────────────────────────────

const DEFAULT_STATE = {
  setup: null,
  loan: null,
  income: null,
  transactions: [],
  chatMessages: [],
};

function reducer(state, action) {
  switch (action.type) {
    case "HYDRATE": return { ...DEFAULT_STATE, ...action.payload };
    case "SETUP": return { ...state, setup: { completedAt: new Date().toISOString() }, loan: action.loan, income: action.income };
    case "ADD_TX": return { ...state, transactions: [action.tx, ...state.transactions] };
    case "ADD_BULK_TX": return { ...state, transactions: [...action.txs, ...state.transactions] };
    case "DELETE_TX": return { ...state, transactions: state.transactions.filter(t => t.id !== action.id) };
    case "RECATEGORIZE": return {
      ...state,
      transactions: state.transactions.map(t =>
        action.map[t.description] && !t.isIncome ? { ...t, category: action.map[t.description] } : t
      ),
    };
    case "ADD_CHAT": return { ...state, chatMessages: [...state.chatMessages, action.msg] };
    case "RESET": return DEFAULT_STATE;
    default: return state;
  }
}

// ─── Setup Wizard ─────────────────────────────────────────────────────────────

function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    loanBalance: "",
    apr: "",
    minPayment: "",
    monthlyTarget: "2000",
    monthlyIncome: "",
  });

  const set = (k, v) => setData(d => ({ ...d, [k]: v }));

  const previewMin = data.loanBalance && data.apr && data.minPayment &&
    calcPayoff(parseFloat(data.loanBalance), parseFloat(data.apr), parseFloat(data.minPayment));
  const previewTarget = data.loanBalance && data.apr && data.monthlyTarget &&
    calcPayoff(parseFloat(data.loanBalance), parseFloat(data.apr), parseFloat(data.monthlyTarget));

  const canStep = {
    1: data.loanBalance && data.apr && data.minPayment &&
      parseFloat(data.loanBalance) > 0 && parseFloat(data.apr) > 0 && parseFloat(data.minPayment) > 0,
    2: data.monthlyTarget && parseFloat(data.monthlyTarget) > 0,
    3: data.monthlyIncome && parseFloat(data.monthlyIncome) > 0,
  };

  const finish = () => {
    onComplete({
      loan: {
        originalBalance: parseFloat(data.loanBalance),
        apr: parseFloat(data.apr),
        minPayment: parseFloat(data.minPayment),
        monthlyTarget: parseFloat(data.monthlyTarget),
      },
      income: { monthly: parseFloat(data.monthlyIncome) },
    });
  };

  if (step === 0) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "72px", marginBottom: "28px" }}>🚛</div>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: "56px", color: "#00c896", letterSpacing: "4px", lineHeight: 1, marginBottom: "14px" }}>DRIVE ZERO</div>
        <div style={{ fontSize: "15px", color: "#71717a", marginBottom: "10px", maxWidth: "290px", lineHeight: 1.7 }}>
          Track every dollar. Pay off your truck faster. No BS.
        </div>
        <div style={{ fontSize: "12px", color: "#27272a", marginBottom: "52px" }}>
          Built for people who actually want out of debt.
        </div>
        <button onClick={() => setStep(1)} style={{ width: "100%", maxWidth: "320px", padding: "20px", background: "#00c896", border: "none", borderRadius: "16px", color: "#000", fontSize: "16px", fontWeight: 800, cursor: "pointer", letterSpacing: "1px" }}>
          SET UP MY PAYOFF PLAN →
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "56px 24px 32px" }}>
      <div style={{ display: "flex", gap: "8px", marginBottom: "48px", justifyContent: "center" }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ width: i <= step ? "28px" : "8px", height: "8px", borderRadius: "4px", background: i < step ? "#00c896" : i === step ? "#00c896" : "#1a1a1a", transition: "all 0.35s cubic-bezier(.16,1,.3,1)" }} />
        ))}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#3f3f46", marginBottom: "10px" }}>STEP {step} OF 3</div>

        {step === 1 && (
          <>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: "40px", color: "#fafafa", letterSpacing: "1px", marginBottom: "32px" }}>Your Loan Details</div>
            {[
              { key: "loanBalance", label: "CURRENT BALANCE", placeholder: "53000" },
              { key: "apr", label: "INTEREST RATE (APR %)", placeholder: "6.9" },
              { key: "minPayment", label: "MINIMUM MONTHLY PAYMENT", placeholder: "800" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: "22px" }}>
                <div style={{ fontSize: "10px", letterSpacing: "2.5px", color: "#3f3f46", marginBottom: "8px" }}>{f.label}</div>
                <div style={{ position: "relative" }}>
                  {f.key !== "apr" && <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", fontFamily: "'IBM Plex Mono'", fontSize: "20px", color: "#3f3f46" }}>$</span>}
                  <input
                    type="number"
                    value={data[f.key]}
                    onChange={e => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    style={{ width: "100%", background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "12px", padding: `16px 16px 16px ${f.key !== "apr" ? "36px" : "16px"}`, color: "#fafafa", fontSize: "22px", fontFamily: "'IBM Plex Mono'", outline: "none", boxSizing: "border-box" }}
                  />
                  {f.key === "apr" && <span style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", fontFamily: "'IBM Plex Mono'", fontSize: "20px", color: "#3f3f46" }}>%</span>}
                </div>
              </div>
            ))}
            {previewMin && (
              <div style={{ padding: "14px 16px", background: "#1a0505", border: "1px solid #ff3b3b20", borderRadius: "10px", marginTop: "4px" }}>
                <div style={{ fontSize: "11px", color: "#ff3b3b", letterSpacing: "2px", marginBottom: "4px" }}>AT MINIMUM PAYMENT</div>
                <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: "16px", color: "#fafafa" }}>{previewMin.months} months · {fmt(previewMin.totalInterest)} in interest</div>
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: "40px", color: "#fafafa", letterSpacing: "1px", marginBottom: "8px" }}>Your Payoff Goal</div>
            <div style={{ fontSize: "13px", color: "#52525b", marginBottom: "32px" }}>How much can you throw at the truck each month?</div>
            <div style={{ marginBottom: "22px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "2.5px", color: "#3f3f46", marginBottom: "8px" }}>MONTHLY PAYMENT TARGET</div>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", fontFamily: "'IBM Plex Mono'", fontSize: "22px", color: "#3f3f46" }}>$</span>
                <input
                  type="number"
                  value={data.monthlyTarget}
                  onChange={e => set("monthlyTarget", e.target.value)}
                  placeholder="2000"
                  style={{ width: "100%", background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "16px 16px 16px 36px", color: "#fafafa", fontSize: "28px", fontFamily: "'IBM Plex Mono'", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>
            {previewTarget && (
              <div style={{ padding: "20px", background: "#0a160f", border: "1px solid #00c89630", borderRadius: "14px" }}>
                <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#00c896", marginBottom: "12px" }}>PAYOFF PREVIEW</div>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: "52px", color: "#00c896", lineHeight: 1 }}>{previewTarget.months}</div>
                <div style={{ fontSize: "14px", color: "#52525b", marginBottom: "10px" }}>months · paid off {previewTarget.payoffDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
                {previewMin && previewMin.months > previewTarget.months && (
                  <div style={{ fontSize: "13px", color: "#34d399" }}>
                    {previewMin.months - previewTarget.months} months sooner · save {fmt(previewMin.totalInterest - previewTarget.totalInterest)} in interest
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: "40px", color: "#fafafa", letterSpacing: "1px", marginBottom: "8px" }}>Monthly Income</div>
            <div style={{ fontSize: "13px", color: "#52525b", marginBottom: "32px" }}>Your take-home pay after taxes (not gross). Used to calculate your cash flow picture.</div>
            <div>
              <div style={{ fontSize: "10px", letterSpacing: "2.5px", color: "#3f3f46", marginBottom: "8px" }}>TAKE-HOME PER MONTH</div>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", fontFamily: "'IBM Plex Mono'", fontSize: "22px", color: "#3f3f46" }}>$</span>
                <input
                  type="number"
                  value={data.monthlyIncome}
                  onChange={e => set("monthlyIncome", e.target.value)}
                  placeholder="5000"
                  style={{ width: "100%", background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "16px 16px 16px 36px", color: "#fafafa", fontSize: "28px", fontFamily: "'IBM Plex Mono'", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>
            {data.monthlyIncome && data.monthlyTarget && parseFloat(data.monthlyIncome) > 0 && (
              <div style={{ marginTop: "20px", padding: "14px 16px", background: "#0f0f0f", borderRadius: "10px", fontSize: "13px", color: "#71717a" }}>
                Truck payment is <span style={{ color: "#fafafa" }}>{((parseFloat(data.monthlyTarget) / parseFloat(data.monthlyIncome)) * 100).toFixed(0)}%</span> of your take-home.
                {(parseFloat(data.monthlyTarget) / parseFloat(data.monthlyIncome)) > 0.2 && (
                  <span style={{ color: "#ff8c00" }}> Aggressive — but doable if you're focused.</span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "32px" }}>
        <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, padding: "16px", background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "12px", color: "#71717a", fontSize: "14px", cursor: "pointer" }}>
          Back
        </button>
        <button
          onClick={() => step < 3 ? setStep(s => s + 1) : finish()}
          disabled={!canStep[step]}
          style={{ flex: 2, padding: "16px", background: canStep[step] ? "#00c896" : "#141414", border: "none", borderRadius: "12px", color: canStep[step] ? "#000" : "#3f3f46", fontSize: "15px", fontWeight: 800, cursor: canStep[step] ? "pointer" : "not-allowed", letterSpacing: "0.5px", transition: "all 0.2s" }}
        >
          {step === 3 ? "START TRACKING →" : "NEXT →"}
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ state }) {
  const { loan, income, transactions } = state;

  const truckPaid = transactions.filter(t => t.category === "truck" && !t.isIncome).reduce((s, t) => s + t.amount, 0);
  const currentBalance = Math.max(0, loan.originalBalance - truckPaid);
  const pct = (truckPaid / loan.originalBalance) * 100;
  const payoff = calcPayoff(currentBalance, loan.apr, loan.monthlyTarget);
  const minPayoff = calcPayoff(currentBalance, loan.apr, loan.minPayment);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthTxs = transactions.filter(t => t.date.startsWith(thisMonth));
  const monthIncome = monthTxs.filter(t => t.isIncome).reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTxs.filter(t => !t.isIncome).reduce((s, t) => s + t.amount, 0);
  const monthNet = monthIncome - monthExpense;

  const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const patterns = detectPatterns(transactions);
  const bills = patterns.filter(p => !p.isIncome).slice(0, 4);

  const totalMonthlyBills = bills.reduce((s, b) => s + b.avgAmount, 0);
  const leftAfterBills = (income?.monthly || 0) - totalMonthlyBills;
  const canAddToTruck = leftAfterBills - loan.monthlyTarget;

  return (
    <div style={{ padding: "0 0 100px" }}>
      {/* Hero progress section */}
      <div style={{ padding: "28px 20px 24px", background: "linear-gradient(180deg, #0a160f 0%, #070707 100%)", borderBottom: "1px solid #0f1f17" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#1a4731", marginBottom: "6px" }}>TRUCK PAYOFF BALANCE</div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: "48px", color: "#fafafa", letterSpacing: "2px", lineHeight: 1 }}>
              {fmt(currentBalance)}
            </div>
            <div style={{ fontSize: "12px", color: "#3f3f46", marginTop: "4px" }}>
              of {fmt(loan.originalBalance)} original
            </div>
          </div>
          {payoff && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: "36px", color: "#00c896", lineHeight: 1, fontWeight: 500 }}>
                {payoff.months}
              </div>
              <div style={{ fontSize: "10px", color: "#1a4731", letterSpacing: "1.5px" }}>MONTHS LEFT</div>
              <div style={{ fontSize: "11px", color: "#3f3f46", marginTop: "4px" }}>
                {payoff.payoffDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </div>
            </div>
          )}
        </div>

        {/* The hero bar */}
        <div style={{ marginTop: "22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: "12px", color: "#00c896" }}>{fmt(truckPaid)} paid</span>
            <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: "12px", color: "#3f3f46" }}>{pct.toFixed(1)}%</span>
          </div>
          <div style={{ height: "14px", background: "#141414", borderRadius: "7px", overflow: "hidden", position: "relative" }}>
            <div style={{
              height: "100%",
              width: `${Math.min(100, Math.max(0, pct))}%`,
              background: "linear-gradient(90deg, #00c89650, #00c896)",
              borderRadius: "7px",
              transition: "width 1.4s cubic-bezier(.16,1,.3,1)",
              boxShadow: pct > 0 ? "0 0 20px #00c89650" : "none",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
            <span style={{ fontSize: "10px", color: "#1a1a1a" }}>$0</span>
            <span style={{ fontSize: "10px", color: "#1a1a1a" }}>{fmt(loan.originalBalance)}</span>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "18px" }}>
          {[
            { label: "INTEREST REMAINING", value: payoff ? fmt(payoff.totalInterest) : "—", color: "#ff8c00" },
            { label: "YOUR MONTHLY TARGET", value: fmt(loan.monthlyTarget), color: "#00c896" },
            ...(minPayoff && payoff ? [
              { label: "MONTHS SAVED", value: `${Math.max(0, minPayoff.months - payoff.months)}mo`, color: "#34d399" },
              { label: "INTEREST SAVED", value: fmt(Math.max(0, minPayoff.totalInterest - payoff.totalInterest)), color: "#34d399" },
            ] : []),
          ].map(s => (
            <div key={s.label} style={{ background: "#0f0f0f", borderRadius: "10px", padding: "12px" }}>
              <div style={{ fontSize: "9px", letterSpacing: "1.5px", color: "#27272a", marginBottom: "5px" }}>{s.label}</div>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: "16px", color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px" }}>
        {/* This month */}
        <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#27272a", marginBottom: "14px" }}>THIS MONTH</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "28px" }}>
          {[
            { label: "IN", value: monthIncome || income?.monthly || 0, color: "#00c896" },
            { label: "OUT", value: monthExpense, color: "#ff3b3b" },
            { label: "NET", value: monthNet, color: monthNet >= 0 ? "#00c896" : "#ff3b3b" },
          ].map(item => (
            <div key={item.label} style={{ background: "#0f0f0f", borderRadius: "12px", padding: "14px 12px", textAlign: "center" }}>
              <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#27272a", marginBottom: "8px" }}>{item.label}</div>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: "16px", color: item.color }}>{fmt(item.value)}</div>
            </div>
          ))}
        </div>

        {/* Cashflow insight */}
        {income?.monthly > 0 && canAddToTruck !== 0 && (
          <div style={{ padding: "14px 16px", background: canAddToTruck > 0 ? "#0a160f" : "#1a0505", border: `1px solid ${canAddToTruck > 0 ? "#00c89620" : "#ff3b3b20"}`, borderRadius: "12px", marginBottom: "24px", fontSize: "13px", color: canAddToTruck > 0 ? "#34d399" : "#ff8c00", lineHeight: 1.5 }}>
            {canAddToTruck > 0
              ? `After your bills and ${fmt(loan.monthlyTarget)}/mo truck payment, you have ${fmt(canAddToTruck)} left. That could knock months off your payoff.`
              : `Your fixed bills + truck target eat ${fmt(Math.abs(canAddToTruck))} more than your income. Check the Payoff tab.`
            }
          </div>
        )}

        {/* Recurring detected */}
        {bills.length > 0 && (
          <>
            <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#27272a", marginBottom: "12px" }}>RECURRING DETECTED</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "28px" }}>
              {bills.map(p => {
                const cat = CATEGORIES.find(c => c.id === p.category) || CATEGORIES.at(-1);
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "12px", background: "#0f0f0f", borderRadius: "10px", padding: "11px 14px" }}>
                    <span style={{ fontSize: "18px" }}>{cat.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", color: "#a1a1aa" }}>{p.description.slice(0, 30)}</div>
                      <div style={{ fontSize: "11px", color: "#3f3f46" }}>~{ordinal(p.dayOfMonth)} of month · seen {p.occurrences}×</div>
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: "14px", color: "#ff8c00" }}>{fmt(p.avgAmount)}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Recent transactions */}
        {recent.length > 0 && (
          <>
            <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#27272a", marginBottom: "12px" }}>RECENT TRANSACTIONS</div>
            {recent.map(tx => {
              const cat = CATEGORIES.find(c => c.id === tx.category) || CATEGORIES.at(-1);
              return (
                <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 0", borderBottom: "1px solid #0f0f0f" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "#0f0f0f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", flexShrink: 0 }}>{cat.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", color: "#fafafa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.description}</div>
                    <div style={{ fontSize: "11px", color: "#3f3f46" }}>{tx.date}</div>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: "14px", color: tx.isIncome ? "#00c896" : "#a1a1aa", flexShrink: 0 }}>
                    {tx.isIncome ? "+" : "-"}{fmt(tx.amount)}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {transactions.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 24px", border: "1px dashed #141414", borderRadius: "16px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#1a1a1a", marginBottom: "12px" }}>NO DATA YET</div>
            <div style={{ fontSize: "13px", color: "#3f3f46", lineHeight: 1.6 }}>
              Upload a bank statement or manually add your first transaction in the Money tab.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Merchant View ────────────────────────────────────────────────────────────

function MerchantView({ transactions, dispatch }) {
  const [expanded, setExpanded] = useState(null);
  const [editingTx, setEditingTx] = useState(null); // { id, category }

  const expense = transactions.filter(t => !t.isIncome);

  // Group by normalized merchant name
  const groupMap = {};
  for (const tx of expense) {
    const key = merchantName(tx.description);
    if (!groupMap[key]) groupMap[key] = { name: key, total: 0, txs: [], category: tx.category };
    groupMap[key].total += tx.amount;
    groupMap[key].txs.push(tx);
    // Use most common category in the group
    const counts = {};
    groupMap[key].txs.forEach(t => { counts[t.category] = (counts[t.category] || 0) + 1; });
    groupMap[key].category = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  const groups = Object.values(groupMap).sort((a, b) => b.total - a.total);

  const saveCategory = (txId, newCat) => {
    dispatch({ type: "RECATEGORIZE", map: Object.fromEntries(
      transactions.filter(t => t.id === txId).map(t => [t.description, newCat])
    )});
    setEditingTx(null);
  };

  if (!groups.length) {
    return (
      <div style={{ padding: "48px 24px", textAlign: "center", color: "#27272a", fontSize: "13px" }}>
        No transactions yet — upload a CSV or add one manually
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 20px 100px" }}>
      <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#27272a", marginBottom: "16px" }}>
        {groups.length} MERCHANTS
      </div>
      {groups.map(g => {
        const cat = CATEGORIES.find(c => c.id === g.category) || CATEGORIES.at(-1);
        const isOpen = expanded === g.name;
        const sorted = [...g.txs].sort((a, b) => b.date.localeCompare(a.date));
        return (
          <div key={g.name} style={{ marginBottom: "8px", background: "#0f0f0f", borderRadius: "12px", overflow: "hidden" }}>
            {/* Merchant header row */}
            <div
              onClick={() => setExpanded(isOpen ? null : g.name)}
              style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 14px", cursor: "pointer" }}
            >
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
                {cat.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", color: "#fafafa", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {g.name}
                </div>
                <div style={{ fontSize: "11px", color: "#3f3f46", marginTop: "2px" }}>
                  <span style={{ color: cat.color }}>{cat.label}</span>
                  {" · "}{g.txs.length} transaction{g.txs.length !== 1 ? "s" : ""}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: "15px", color: "#fafafa" }}>{fmt(g.total)}</div>
                <div style={{ fontSize: "10px", color: "#3f3f46", marginTop: "2px" }}>
                  avg {fmt(g.total / g.txs.length)}
                </div>
              </div>
              <div style={{ color: "#27272a", fontSize: "12px", marginLeft: "4px" }}>{isOpen ? "▲" : "▼"}</div>
            </div>

            {/* Expanded transactions */}
            {isOpen && (
              <div style={{ borderTop: "1px solid #141414" }}>
                {sorted.map((tx, i) => {
                  const txCat = CATEGORIES.find(c => c.id === tx.category) || CATEGORIES.at(-1);
                  const isEditing = editingTx === tx.id;
                  return (
                    <div key={tx.id}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderBottom: i < sorted.length - 1 ? "1px solid #0a0a0a" : "none" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", color: "#71717a" }}>{tx.date}</span>
                            <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: "13px", color: "#fafafa" }}>-{fmt(tx.amount)}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                            <button
                              onClick={() => setEditingTx(isEditing ? null : tx.id)}
                              style={{ display: "flex", alignItems: "center", gap: "4px", background: "#141414", border: "none", borderRadius: "6px", padding: "3px 8px", cursor: "pointer", color: txCat.color, fontSize: "11px" }}
                            >
                              {txCat.emoji} {txCat.label} ✎
                            </button>
                            <button onClick={() => dispatch({ type: "DELETE_TX", id: tx.id })} style={{ background: "none", border: "none", color: "#27272a", cursor: "pointer", fontSize: "14px", padding: "0 4px" }}>×</button>
                          </div>
                        </div>
                      </div>
                      {isEditing && (
                        <div style={{ padding: "8px 14px 12px", background: "#0a0a0a", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                          {CATEGORIES.filter(c => c.id !== "income").map(c => (
                            <button
                              key={c.id}
                              onClick={() => saveCategory(tx.id, c.id)}
                              style={{ padding: "8px 6px", background: tx.category === c.id ? "#141414" : "transparent", border: `1px solid ${tx.category === c.id ? c.color + "50" : "#141414"}`, borderRadius: "8px", color: tx.category === c.id ? c.color : "#52525b", fontSize: "11px", cursor: "pointer", textAlign: "center" }}
                            >
                              {c.emoji}<br />{c.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Money View ───────────────────────────────────────────────────────────────

function MoneyView({ state, dispatch }) {
  const [sub, setSub] = useState("list");
  const [bankGuide, setBankGuide] = useState(null);
  const [filter, setFilter] = useState("all");
  const [uploadMsg, setUploadMsg] = useState(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    category: "other",
    isIncome: false,
  });
  const fileRef = useRef();
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submitTx = () => {
    if (!form.description.trim() || !form.amount || parseFloat(form.amount) <= 0) return;
    dispatch({
      type: "ADD_TX",
      tx: {
        id: `manual_${Date.now()}`,
        date: form.date,
        description: form.description.trim(),
        amount: parseFloat(form.amount),
        category: form.isIncome ? "income" : form.category,
        isIncome: form.isIncome,
        isRecurring: false,
        source: "manual",
      },
    });
    setForm({ date: new Date().toISOString().split("T")[0], description: "", amount: "", category: "other", isIncome: false });
    setSub("list");
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadMsg({ type: "info", text: "Parsing your statement..." });
    try {
      const text = await file.text();
      const txs = csvToTransactions(text);
      if (!txs.length) {
        setUploadMsg({ type: "error", text: "Couldn't read transactions from this file. Try the bank guide to make sure you're exporting CSV correctly." });
        e.target.value = "";
        return;
      }
      const existingKeys = new Set(state.transactions.map(t => `${t.date}|${t.description}|${t.amount}`));
      const fresh = txs.filter(t => !existingKeys.has(`${t.date}|${t.description}|${t.amount}`));
      const skipped = txs.length - fresh.length;

      dispatch({ type: "ADD_BULK_TX", txs: fresh });
      setUploadMsg({ type: "info", text: `Imported ${fresh.length} transactions. Categorizing with AI…` });

      // AI categorization — send unique descriptions, apply returned map
      try {
        const unique = [...new Set(fresh.filter(t => !t.isIncome).map(t => t.description))];
        if (unique.length) {
          const res = await fetch("/api/categorize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ descriptions: unique }),
          });
          if (res.ok) {
            const { categories } = await res.json();
            if (categories && Object.keys(categories).length > 0) {
              dispatch({ type: "RECATEGORIZE", map: categories });
            }
          }
        }
      } catch { /* AI unavailable — keyword categories stay */ }

      setUploadMsg({
        type: "success",
        text: `Imported ${fresh.length} transactions${skipped ? ` · ${skipped} duplicates skipped` : ""}. Categories set by AI.`,
      });
    } catch {
      setUploadMsg({ type: "error", text: "Error reading the file. Make sure it's a CSV, not a PDF." });
    }
    e.target.value = "";
  };

  const displayed = state.transactions
    .filter(t => filter === "all" || (filter === "income" ? t.isIncome : t.category === filter))
    .sort((a, b) => b.date.localeCompare(a.date));

  const spendByCategory = CATEGORIES
    .filter(c => c.id !== "income")
    .map(c => ({ ...c, total: state.transactions.filter(t => t.category === c.id && !t.isIncome).reduce((s, t) => s + t.amount, 0) }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const grandTotal = spendByCategory.reduce((s, c) => s + c.total, 0);

  return (
    <div style={{ padding: "0 0 100px" }}>
      {/* Sub nav */}
      <div style={{ display: "flex", borderBottom: "1px solid #0f0f0f" }}>
        {[{ id: "list", label: "All" }, { id: "merchants", label: "Merchants" }, { id: "add", label: "+ Add" }, { id: "upload", label: "Upload" }].map(t => (
          <button key={t.id} onClick={() => setSub(t.id)} style={{ flex: 1, padding: "14px 4px", background: "none", border: "none", borderBottom: `2px solid ${sub === t.id ? "#00c896" : "transparent"}`, color: sub === t.id ? "#00c896" : "#3f3f46", fontSize: "11px", letterSpacing: "1.5px", cursor: "pointer", transition: "color 0.2s" }}>
            {t.label.toUpperCase()}
          </button>
        ))}
      </div>

      {sub === "list" && (
        <div style={{ padding: "20px" }}>
          {/* Spending breakdown */}
          {spendByCategory.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#27272a", marginBottom: "14px" }}>SPENDING BREAKDOWN (ALL TIME)</div>
              {spendByCategory.slice(0, 6).map(c => (
                <div key={c.id} style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ fontSize: "12px", color: "#a1a1aa" }}>{c.emoji} {c.label}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: "12px", color: c.color }}>{fmt(c.total)} <span style={{ color: "#3f3f46" }}>({((c.total / grandTotal) * 100).toFixed(0)}%)</span></span>
                  </div>
                  <div style={{ height: "4px", background: "#141414", borderRadius: "2px" }}>
                    <div style={{ height: "100%", width: `${(c.total / grandTotal) * 100}%`, background: c.color, borderRadius: "2px", opacity: 0.75 }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Filter chips */}
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "12px", marginBottom: "12px", scrollbarWidth: "none" }}>
            {["all", "income", ...CATEGORIES.filter(c => c.id !== "income").map(c => c.id)].map(f => {
              const cat = CATEGORIES.find(c => c.id === f);
              return (
                <button key={f} onClick={() => setFilter(f)} style={{ flexShrink: 0, padding: "5px 14px", background: filter === f ? "#fafafa" : "#0f0f0f", border: "none", borderRadius: "20px", color: filter === f ? "#000" : "#52525b", fontSize: "11px", cursor: "pointer" }}>
                  {f === "all" ? "All" : f === "income" ? "💰 Income" : `${cat?.emoji} ${cat?.label}`}
                </button>
              );
            })}
          </div>

          {displayed.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#27272a", fontSize: "13px" }}>
              {state.transactions.length === 0 ? "No transactions yet — add one or upload a CSV" : "No transactions in this category"}
            </div>
          )}

          {displayed.map(tx => {
            const cat = CATEGORIES.find(c => c.id === tx.category) || CATEGORIES.at(-1);
            return (
              <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 0", borderBottom: "1px solid #0f0f0f" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#0f0f0f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>{cat.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", color: "#fafafa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.description}</div>
                  <div style={{ fontSize: "11px", color: "#3f3f46" }}>{tx.date} · {cat.label}{tx.source === "csv" ? " · imported" : ""}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: "14px", color: tx.isIncome ? "#00c896" : "#fafafa" }}>
                    {tx.isIncome ? "+" : "-"}{fmt(tx.amount)}
                  </div>
                  <button onClick={() => dispatch({ type: "DELETE_TX", id: tx.id })} style={{ background: "none", border: "none", color: "#27272a", cursor: "pointer", fontSize: "16px", padding: "4px", lineHeight: 1 }}>×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sub === "merchants" && (
        <MerchantView transactions={state.transactions} dispatch={dispatch} />
      )}

      {sub === "add" && (
        <div style={{ padding: "24px 20px" }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: "30px", color: "#fafafa", letterSpacing: "1px", marginBottom: "24px" }}>ADD TRANSACTION</div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "22px" }}>
            {[{ v: false, label: "💸 Expense" }, { v: true, label: "💰 Income" }].map(o => (
              <button key={o.label} onClick={() => sf("isIncome", o.v)} style={{ flex: 1, padding: "13px", background: form.isIncome === o.v ? (o.v ? "#0a160f" : "#1a0505") : "#0f0f0f", border: `1px solid ${form.isIncome === o.v ? (o.v ? "#00c89640" : "#ff3b3b40") : "#141414"}`, borderRadius: "10px", color: form.isIncome === o.v ? (o.v ? "#00c896" : "#ff3b3b") : "#52525b", fontSize: "13px", cursor: "pointer" }}>
                {o.label}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#3f3f46", marginBottom: "7px" }}>DATE</div>
            <input type="date" value={form.date} onChange={e => sf("date", e.target.value)} style={{ width: "100%", background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "13px 14px", color: "#fafafa", fontSize: "15px", outline: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#3f3f46", marginBottom: "7px" }}>DESCRIPTION</div>
            <input type="text" value={form.description} onChange={e => sf("description", e.target.value)} placeholder="e.g. Toyota Financial" style={{ width: "100%", background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "13px 14px", color: "#fafafa", fontSize: "15px", outline: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: form.isIncome ? "24px" : "20px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#3f3f46", marginBottom: "7px" }}>AMOUNT ($)</div>
            <input type="number" value={form.amount} onChange={e => sf("amount", e.target.value)} placeholder="0.00" style={{ width: "100%", background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "13px 14px", color: "#fafafa", fontSize: "22px", fontFamily: "'IBM Plex Mono'", outline: "none", boxSizing: "border-box" }} />
          </div>

          {!form.isIncome && (
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#3f3f46", marginBottom: "10px" }}>CATEGORY</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px" }}>
                {CATEGORIES.filter(c => c.id !== "income").map(c => (
                  <button key={c.id} onClick={() => sf("category", c.id)} style={{ padding: "11px 10px", background: form.category === c.id ? "#141414" : "#0a0a0a", border: `1px solid ${form.category === c.id ? c.color + "50" : "#141414"}`, borderRadius: "9px", color: form.category === c.id ? c.color : "#52525b", fontSize: "12px", cursor: "pointer", textAlign: "left" }}>
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={submitTx} disabled={!form.description.trim() || !form.amount || parseFloat(form.amount) <= 0} style={{ width: "100%", padding: "16px", background: form.description.trim() && form.amount && parseFloat(form.amount) > 0 ? "#00c896" : "#141414", border: "none", borderRadius: "12px", color: form.description.trim() && form.amount && parseFloat(form.amount) > 0 ? "#000" : "#3f3f46", fontSize: "15px", fontWeight: 800, cursor: "pointer", letterSpacing: "0.5px" }}>
            ADD TRANSACTION →
          </button>
        </div>
      )}

      {sub === "upload" && (
        <div style={{ padding: "24px 20px" }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: "30px", color: "#fafafa", letterSpacing: "1px", marginBottom: "6px" }}>UPLOAD STATEMENT</div>
          <div style={{ fontSize: "13px", color: "#52525b", marginBottom: "24px", lineHeight: 1.6 }}>
            Export a CSV from your bank and upload it here. We auto-detect formats for Chase, BoA, Wells Fargo, Capital One, Citi, USAA, Ally, and more.
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            style={{ border: "2px dashed #1a1a1a", borderRadius: "16px", padding: "44px 24px", textAlign: "center", marginBottom: "24px", cursor: "pointer", transition: "border-color 0.2s" }}
          >
            <div style={{ fontSize: "44px", marginBottom: "14px" }}>📂</div>
            <div style={{ fontSize: "14px", color: "#a1a1aa", marginBottom: "6px" }}>Tap to select your CSV file</div>
            <div style={{ fontSize: "11px", color: "#27272a" }}>No login needed. File stays on your device.</div>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleUpload} style={{ display: "none" }} />
          </div>

          {uploadMsg && (
            <div style={{ padding: "14px 16px", background: "#0f0f0f", border: `1px solid ${uploadMsg.type === "success" ? "#00c89630" : uploadMsg.type === "error" ? "#ff3b3b30" : "#1a1a1a"}`, borderRadius: "10px", fontSize: "13px", color: uploadMsg.type === "success" ? "#00c896" : uploadMsg.type === "error" ? "#ff3b3b" : "#a1a1aa", marginBottom: "24px", lineHeight: 1.5 }}>
              {uploadMsg.text}
            </div>
          )}

          <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#27272a", marginBottom: "14px" }}>HOW TO GET YOUR CSV — PICK YOUR BANK</div>

          {bankGuide === null ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {BANK_GUIDES.map((b, i) => (
                <button key={i} onClick={() => setBankGuide(i)} style={{ padding: "13px 10px", background: "#0f0f0f", border: "1px solid #141414", borderRadius: "10px", color: "#a1a1aa", fontSize: "13px", cursor: "pointer", textAlign: "left" }}>
                  🏦 {b.name}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ background: "#0f0f0f", borderRadius: "16px", padding: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: "24px", color: "#fafafa", letterSpacing: "1px" }}>🏦 {BANK_GUIDES[bankGuide].name}</div>
                <button onClick={() => setBankGuide(null)} style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer", fontSize: "20px" }}>✕</button>
              </div>
              {BANK_GUIDES[bankGuide].steps.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: "14px", marginBottom: "14px", alignItems: "flex-start" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#00c89615", border: "1px solid #00c89640", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#00c896", flexShrink: 0, fontFamily: "'IBM Plex Mono'", marginTop: "1px" }}>{i + 1}</div>
                  <div style={{ fontSize: "13px", color: "#a1a1aa", lineHeight: 1.6, paddingTop: "2px" }}>{step}</div>
                </div>
              ))}
              <button onClick={() => { setBankGuide(null); fileRef.current?.click(); }} style={{ width: "100%", marginTop: "10px", padding: "14px", background: "#00c896", border: "none", borderRadius: "10px", color: "#000", fontSize: "13px", fontWeight: 800, cursor: "pointer" }}>
                I HAVE MY CSV — UPLOAD NOW →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Payoff View ──────────────────────────────────────────────────────────────

function PayoffView({ state }) {
  const { loan, transactions } = state;
  const [extraInput, setExtraInput] = useState("");

  const truckPaid = transactions.filter(t => t.category === "truck" && !t.isIncome).reduce((s, t) => s + t.amount, 0);
  const balance = Math.max(0, loan.originalBalance - truckPaid);

  const extraAmt = parseFloat(extraInput) || 0;
  const scenarios = [
    { label: "Minimum Only", monthly: loan.minPayment, color: "#ff3b3b" },
    { label: `Goal — ${fmt(loan.monthlyTarget)}/mo`, monthly: loan.monthlyTarget, color: "#00c896" },
    ...(extraAmt > loan.monthlyTarget ? [{ label: `Aggressive — ${fmt(extraAmt)}/mo`, monthly: extraAmt, color: "#f59e0b" }] : []),
  ].filter(s => s.monthly > 0);

  const computed = scenarios.map(s => ({ ...s, result: calcPayoff(balance, loan.apr, s.monthly) })).filter(s => s.result);
  const baseMonths = computed[0]?.result?.months || 1;
  const W = 320, H = 120;

  const amortPoints = (monthly) => {
    const r = loan.apr / 100 / 12;
    const result = calcPayoff(balance, loan.apr, monthly);
    if (!result) return [];
    let bal = balance;
    const pts = [];
    for (let m = 0; m <= result.months && bal > 0; m++) {
      pts.push({ m, bal });
      bal = Math.max(0, bal * (1 + r) - monthly);
    }
    pts.push({ m: result.months, bal: 0 });
    return pts;
  };

  const polylinePoints = (pts, color) => {
    if (!pts.length) return null;
    const maxM = baseMonths;
    const points = pts.map(p => `${(p.m / maxM) * (W - 20) + 10},${H - (p.bal / balance) * (H - 16) - 8}`).join(" ");
    return <polyline key={color} points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />;
  };

  return (
    <div style={{ padding: "24px 20px 100px" }}>
      <div style={{ fontFamily: "'Bebas Neue'", fontSize: "38px", color: "#fafafa", letterSpacing: "2px", marginBottom: "6px" }}>PAYOFF SCENARIOS</div>
      <div style={{ fontSize: "13px", color: "#52525b", marginBottom: "28px", lineHeight: 1.6 }}>
        Every extra dollar you throw at the principal saves you months and interest. See it here.
      </div>

      <div style={{ background: "#0f0f0f", borderRadius: "14px", padding: "16px 18px", marginBottom: "24px" }}>
        <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#3f3f46", marginBottom: "10px" }}>WHAT IF I PAID MORE?</div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: "20px", color: "#f59e0b" }}>$</span>
          <input
            type="number"
            value={extraInput}
            onChange={e => setExtraInput(e.target.value)}
            placeholder={`${Math.round(loan.monthlyTarget * 1.25)}`}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: "'IBM Plex Mono'", fontSize: "26px", color: "#fafafa" }}
          />
          <span style={{ fontSize: "12px", color: "#3f3f46" }}>/month</span>
        </div>
      </div>

      {computed.length >= 2 && (
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#27272a", marginBottom: "12px" }}>BALANCE OVER TIME</div>
          <div style={{ background: "#0a0a0a", borderRadius: "12px", padding: "16px", overflow: "hidden" }}>
            <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
              <line x1="10" y1={H - 8} x2={W - 10} y2={H - 8} stroke="#1a1a1a" strokeWidth="1" />
              <line x1="10" y1="8" x2="10" y2={H - 8} stroke="#1a1a1a" strokeWidth="1" />
              {computed.map(s => polylinePoints(amortPoints(s.monthly), s.color))}
            </svg>
            <div style={{ display: "flex", gap: "16px", marginTop: "10px" }}>
              {computed.map(s => (
                <div key={s.color} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "20px", height: "3px", background: s.color, borderRadius: "2px" }} />
                  <span style={{ fontSize: "10px", color: "#52525b" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {computed.map((s, i) => {
        const base = computed[0];
        const monthsSaved = i > 0 ? base.result.months - s.result.months : 0;
        const interestSaved = i > 0 ? Math.max(0, base.result.totalInterest - s.result.totalInterest) : 0;
        return (
          <div key={s.label} style={{ background: "#0f0f0f", borderRadius: "14px", padding: "20px", marginBottom: "12px", border: `1px solid ${s.color}18` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "10px", letterSpacing: "2px", color: s.color, marginBottom: "6px" }}>{s.label.toUpperCase()}</div>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: "40px", color: "#fafafa", letterSpacing: "1px", lineHeight: 1 }}>
                  {s.result.months} <span style={{ fontSize: "20px", color: "#3f3f46" }}>months</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", color: "#27272a" }}>Paid off by</div>
                <div style={{ fontSize: "14px", color: "#a1a1aa", fontWeight: 500 }}>
                  {s.result.payoffDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "9px", color: "#27272a", letterSpacing: "1.5px", marginBottom: "4px" }}>TOTAL INTEREST</div>
                <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: "16px", color: "#ff8c00" }}>{fmt(s.result.totalInterest)}</div>
              </div>
              {monthsSaved > 0 && (
                <div>
                  <div style={{ fontSize: "9px", color: "#27272a", letterSpacing: "1.5px", marginBottom: "4px" }}>VS MINIMUM</div>
                  <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: "14px", color: "#00c896" }}>
                    -{monthsSaved}mo<br />{fmt(interestSaved)} saved
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: "20px", padding: "16px", background: "#0a0a0a", borderRadius: "12px", fontSize: "12px", color: "#3f3f46", lineHeight: 1.6 }}>
        Calculations assume a fixed APR of {loan.apr}% and that every payment goes to this loan. Current balance: {fmt(balance)}.
      </div>
    </div>
  );
}

// ─── AI Chat ──────────────────────────────────────────────────────────────────

function AIChat({ state, dispatch }) {
  const { loan, income, transactions, chatMessages } = state;
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  const truckPaid = transactions.filter(t => t.category === "truck" && !t.isIncome).reduce((s, t) => s + t.amount, 0);
  const currentBalance = Math.max(0, loan.originalBalance - truckPaid);
  const months = new Set(transactions.map(t => t.date.slice(0, 7)));
  const monthlyAvgExpense = months.size > 0 ? transactions.filter(t => !t.isIncome).reduce((s, t) => s + t.amount, 0) / months.size : 0;

  const context = {
    loan: { ...loan, currentBalance, paidSoFar: truckPaid },
    income,
    patterns: detectPatterns(transactions).slice(0, 6),
    spending: {
      totalTransactions: transactions.length,
      monthsOfData: months.size,
      monthlyAvgExpense: Math.round(monthlyAvgExpense),
      byCategory: Object.fromEntries(
        CATEGORIES.map(c => [c.label, Math.round(transactions.filter(t => t.category === c.id && !t.isIncome).reduce((s, t) => s + t.amount, 0))])
      ),
    },
  };

  const SUGGESTED = [
    "How long until I pay off the truck at my target payment?",
    "What's my biggest spending category and how can I cut it?",
    "If I skipped dining out for 3 months, how much sooner would I pay off?",
    "Which of my recurring bills could I eliminate or reduce?",
    "Give me a brutal 30-day plan to pay off my truck faster.",
  ];

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    dispatch({ type: "ADD_CHAT", msg: { role: "user", content: msg, ts: Date.now() } });
    setLoading(true);

    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, context }),
      });
      const data = res.ok ? await res.json() : {};
      dispatch({ type: "ADD_CHAT", msg: { role: "assistant", content: data.text || "Couldn't get a response. Check that ANTHROPIC_API_KEY is set in your environment.", ts: Date.now() } });
    } catch {
      dispatch({ type: "ADD_CHAT", msg: { role: "assistant", content: "Connection failed. Make sure the API endpoint is deployed.", ts: Date.now() } });
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 130px)" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {chatMessages.length === 0 && (
          <div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: "30px", color: "#fafafa", letterSpacing: "1px", marginBottom: "6px" }}>AI FINANCIAL ADVISOR</div>
            <div style={{ fontSize: "13px", color: "#52525b", marginBottom: "28px", lineHeight: 1.6 }}>
              I know your loan details, spending patterns, and recurring bills. Ask me anything — I'll give you direct, data-backed answers.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {SUGGESTED.map((q, i) => (
                <button key={i} onClick={() => setInput(q)} style={{ padding: "13px 15px", background: "#0f0f0f", border: "1px solid #141414", borderRadius: "10px", color: "#a1a1aa", fontSize: "13px", cursor: "pointer", textAlign: "left", lineHeight: 1.4 }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((m, i) => (
          <div key={i} style={{ marginBottom: "18px", display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: "10px" }}>
            {m.role === "assistant" && (
              <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#0f0f0f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", flexShrink: 0, marginTop: "2px" }}>✦</div>
            )}
            <div style={{ maxWidth: "82%", padding: "13px 15px", background: m.role === "user" ? "#00c89615" : "#0f0f0f", border: `1px solid ${m.role === "user" ? "#00c89635" : "#141414"}`, borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", fontSize: "14px", color: "#fafafa", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#0f0f0f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px" }}>✦</div>
            <div style={{ padding: "13px 18px", background: "#0f0f0f", border: "1px solid #141414", borderRadius: "14px" }}>
              <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3f3f46", animation: "pulse 1.2s infinite", animationDelay: `${i * 0.22}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "12px 20px 20px", borderTop: "1px solid #0f0f0f" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask about your finances..."
            disabled={loading}
            style={{ flex: 1, background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "13px 16px", color: "#fafafa", fontSize: "14px", outline: "none" }}
          />
          <button onClick={send} disabled={loading || !input.trim()} style={{ width: "48px", background: !loading && input.trim() ? "#00c896" : "#141414", border: "none", borderRadius: "12px", color: !loading && input.trim() ? "#000" : "#3f3f46", fontSize: "20px", cursor: !loading && input.trim() ? "pointer" : "not-allowed", transition: "all 0.2s" }}>→</button>
        </div>
      </div>
    </div>
  );
}

// ─── Finance Root ─────────────────────────────────────────────────────────────

const TABS = [
  { id: "dash",   label: "DASH",   icon: "◉" },
  { id: "money",  label: "MONEY",  icon: "$" },
  { id: "payoff", label: "PAYOFF", icon: "▲" },
  { id: "ai",     label: "AI",     icon: "✦" },
];

export default function Finance() {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);
  const [tab, setTab] = useState("dash");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "HYDRATE", payload: JSON.parse(raw) });
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [state, hydrated]);

  if (!hydrated) return null;

  if (!state.setup) {
    return <SetupWizard onComplete={({ loan, income }) => dispatch({ type: "SETUP", loan, income })} />;
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {tab === "dash" && <Dashboard state={state} />}
      {tab === "money" && <MoneyView state={state} dispatch={dispatch} />}
      {tab === "payoff" && <PayoffView state={state} />}
      {tab === "ai" && <AIChat state={state} dispatch={dispatch} />}

      <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: "420px", background: "rgba(7,7,7,0.96)", backdropFilter: "blur(12px)", borderTop: "1px solid #0f0f0f", display: "flex", zIndex: 50 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "12px 4px 18px", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <div style={{ fontSize: "20px", color: tab === t.id ? "#00c896" : "#27272a", fontFamily: "'IBM Plex Mono'", lineHeight: 1, transition: "color 0.2s" }}>{t.icon}</div>
            <div style={{ fontSize: "9px", letterSpacing: "2px", color: tab === t.id ? "#00c896" : "#27272a", transition: "color 0.2s" }}>{t.label}</div>
          </button>
        ))}
      </nav>
    </div>
  );
}
