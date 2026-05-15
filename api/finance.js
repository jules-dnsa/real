// Vercel Serverless Function — AI financial advisor endpoint.
// Injects the user's real financial context into every prompt so Claude
// can give specific, data-backed answers instead of generic advice.
//
// Requires ANTHROPIC_API_KEY set in Vercel → Project → Settings → Environment Variables.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, context } = req.body || {};
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Missing message" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY env var not set" });
  }

  const loanCtx = context?.loan
    ? `Loan: ${JSON.stringify(context.loan)}`
    : "No loan data provided.";

  const incomeCtx = context?.income
    ? `Income: $${context.income.monthly}/month take-home`
    : "No income data provided.";

  const spendCtx = context?.spending
    ? `Spending: ${JSON.stringify(context.spending)}`
    : "No spending data yet.";

  const patternCtx = context?.patterns?.length
    ? `Recurring patterns detected: ${JSON.stringify(context.patterns)}`
    : "No recurring patterns detected yet.";

  const system = `You are a direct, no-fluff financial advisor embedded in a personal finance app called Drive Zero. The user's primary goal is to pay off their truck as fast as possible.

Give specific, data-driven advice using the user's real numbers below. Be honest — if their spending is a problem, say so. Skip motivational fluff. Keep responses under 200 words unless the user asks for more detail. Use line breaks for readability. Format dollar amounts clearly.

USER'S FINANCIAL CONTEXT:
${loanCtx}
${incomeCtx}
${spendCtx}
${patternCtx}

If the user asks about payoff timelines, calculate using the loan balance, APR, and target payment in their context. If they ask "what if I paid $X more," work it out and show months saved and interest saved.`;

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
        max_tokens: 600,
        system,
        messages: [{ role: "user", content: message.trim().slice(0, 800) }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return res.status(response.status).json({ error: "Upstream API error", detail });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "No response from AI.";
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
