export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, provider = "openai" } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    let response;
    let data;
    let answer;

    // =========================
    // OPENAI / CHATGPT
    // =========================
    if (provider === "openai") {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

      response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-5",
          input: message
        })
      });

      data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          error: data?.error?.message || "OpenAI request failed"
        });
      }

      answer = data.output_text;
    }

    // =========================
    // GEMINI
    // =========================
    else if (provider === "gemini") {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key not configured" });
      }

      const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: message
                  }
                ]
              }
            ]
          })
        }
      );

      data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          error: data?.error?.message || "Gemini request failed"
        });
      }

      answer =
        data?.candidates?.[0]?.content?.parts
          ?.map(part => part.text || "")
          .join("") || "No response from Gemini.";
    }

    // =========================
    // GROK / xAI
    // =========================
    else if (provider === "grok") {
      if (!process.env.XAI_API_KEY) {
        return res.status(500).json({ error: "xAI API key not configured" });
      }

      response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.XAI_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.XAI_MODEL || "grok-4",
          messages: [
            {
              role: "user",
              content: message
            }
          ]
        })
      });

      data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          error: data?.error?.message || "Grok request failed"
        });
      }

      answer = data?.choices?.[0]?.message?.content;
    }

    else {
      return res.status(400).json({
        error: "Unknown provider"
      });
    }

    return res.status(200).json({
      success: true,
      provider,
      answer: answer || "The AI returned an empty response."
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "NEXUS AI server error"
    });
  }
}
