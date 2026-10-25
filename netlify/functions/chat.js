// Netlify serverless function: proxies chat requests to OpenRouter.
// The API key stays here, on the server, and is never sent to the browser.
//
// SETUP:
// 1. In the Netlify dashboard: Site settings -> Environment variables
//    Add OPENROUTER_API_KEY = sk-or-... (your OpenRouter key)
//    Optionally add OPENROUTER_MODEL to override the default model below.
// 2. Commit this file at netlify/functions/chat.js and netlify.toml at the repo root.
// 3. Netlify auto-detects the functions folder and deploys it alongside your site.

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server is missing OPENROUTER_API_KEY. Add it in Netlify env vars." })
    };
  }

  let messages;
  try {
    const body = JSON.parse(event.body || "{}");
    messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("messages must be a non-empty array");
    }
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body" }) };
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        // OpenRouter asks for these so it can attribute traffic to your site/app
        "HTTP-Referer": "https://vishalhirani.netlify.app",
        "X-Title": "Vishal Hirani Portfolio Assistant"
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openrouter/free",
        messages,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error?.message || "OpenRouter request failed" })
      };
    }

    const reply = data.choices?.[0]?.message?.content?.trim() || "Sorry, I couldn't generate a reply.";
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
