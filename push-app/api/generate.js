// Vercel Serverless Function — proxies requests to the Anthropic API
// so your API key never leaves the server.
//
// Set ANTHROPIC_API_KEY in Vercel → Project → Settings → Environment Variables.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { goal } = req.body || {};
  if (!goal || typeof goal !== "string" || !goal.trim()) {
    return res.status(400).json({ error: "Missing or invalid goal" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY env var not set" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        // Cheap + fast for structured JSON. Swap to "claude-sonnet-4-6" or
        // "claude-opus-4-7" for higher quality at higher cost.
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system:
          `Brutally direct accountability coach. Break goals into 3-5 specific actionable steps. No fluff. Include numbers when relevant. Respond ONLY with valid JSON no markdown: {"goal":"concise title max 8 words","category":"Finance|Health|Career|Personal|Home|Vehicle|Other","priority":"high|medium|low","subtasks":["step 1","step 2","step 3"]}`,
        messages: [{ role: "user", content: goal.slice(0, 500) }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return res.status(response.status).json({ error: "Upstream API error", detail });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
