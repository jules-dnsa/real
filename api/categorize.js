// Vercel Serverless Function — AI batch categorization for imported transactions.
// Receives an array of unique transaction descriptions, returns a map of
// description → category so the client can update all matching rows at once.

const VALID_CATEGORIES = new Set([
  "truck", "housing", "utilities", "groceries", "gas",
  "subscriptions", "dining", "insurance", "medical", "income", "other",
]);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { descriptions } = req.body || {};
  if (!Array.isArray(descriptions) || !descriptions.length) {
    return res.status(400).json({ error: "Missing descriptions array" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  // Cap at 120 unique descriptions per call to keep prompt size reasonable
  const unique = [...new Set(descriptions)].slice(0, 120);

  const prompt = `You are categorizing bank transaction descriptions for a personal finance app. Return ONLY a JSON object — no markdown, no explanation.

Valid categories: truck, housing, utilities, groceries, gas, subscriptions, dining, insurance, medical, income, other

INCOME rules — be very strict, most credits are NOT income:
- "income" ONLY for: payroll direct deposits, salary, ADP/Paychex/Gusto payroll, IRS tax refunds, Social Security, unemployment benefits
- Zelle payments received = "other" (peer transfer, not income)
- Venmo, Cash App, PayPal transfers in = "other"
- ATM deposits, cash deposits = "other"
- "Return of posted check", returned items, returned checks = "other"
- Fee reversals, overdraft reversals, credit adjustments = "other"
- "Transfer from" savings/checking = "other"
- Refunds from merchants = category of that merchant (e.g. Amazon refund = "other", restaurant refund = "dining")
- When in doubt about a credit, use "other" — not "income"

EXPENSE rules:
- Restaurants, fast food, coffee shops, food delivery (DoorDash, Uber Eats, Grubhub) = "dining"
- Gas pump charges at gas stations = "gas"
- Gas station convenience store / food purchases (snacks, drinks) = "dining"
- 7-Eleven, Circle K, Wawa, Sheetz, Kwik Trip, Pilot, Flying J food = "dining"
- Grocery stores (Walmart Grocery, Kroger, Safeway, HEB, Publix, etc.) = "groceries"
- Target, Walmart general merchandise = "other"
- Auto loan payments (Toyota Financial, Ford Motor Credit, Ally Auto, GM Financial) = "truck"
- Netflix, Spotify, Hulu, Disney+, gym memberships = "subscriptions"
- Electric, water, gas utility, internet, phone bills = "utilities"
- Rent or mortgage payments = "housing"
- Health/car/renters insurance = "insurance"
- Doctor, hospital, pharmacy, dental = "medical"

Descriptions to categorize:
${unique.map((d, i) => `${i + 1}. ${d}`).join("\n")}

Return JSON only — keys are the exact descriptions above, values are category strings:`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return res.status(response.status).json({ error: "Upstream error", detail });
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text || "{}";
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();

    let parsed = {};
    try { parsed = JSON.parse(cleaned); } catch { /* return empty map — keywords stay */ }

    // Sanitize: keep only valid category values
    const categories = Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => VALID_CATEGORIES.has(v))
    );

    return res.status(200).json({ categories });
  } catch (err) {
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
