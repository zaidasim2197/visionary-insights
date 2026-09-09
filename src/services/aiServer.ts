import { createServerFn } from "@tanstack/react-start";

export interface AIServerRequest {
  question: string;
  structuredFacts: string;
  isSupported: boolean;
  fallbackAnswer: string;
  chatHistory?: { sender: "user" | "ai"; text: string }[];
}

export interface AIServerResponse {
  answer: string;
  source: string;
}

export const queryGeminiServerFn = createServerFn({ method: "POST" })
  .validator((data: AIServerRequest) => data)
  .handler(async ({ data }): Promise<AIServerResponse> => {
    const { question, structuredFacts, isSupported, fallbackAnswer, chatHistory } = data;

    if (!isSupported) {
      return {
        answer: "I can't help with that. I can only answer questions about the available Sales & Operations data.",
        source: "Dataset Guardrails",
      };
    }

    const apiKey = process.env["GEMINI_API_KEY"] || "AIzaSyCrOmG9m2xjel91Aqb2KlQxIuepNXeUvL8";

    try {
      const historyText =
        chatHistory && chatHistory.length > 0
          ? `Recent Conversation Context:\n` +
            chatHistory
              .slice(-6)
              .map((m) => `${m.sender === "user" ? "User" : "Assistant"}: ${m.text}`)
              .join("\n") +
            `\n\n`
          : "";

      const prompt = `You are the PulseOps Technologies B2B Sales & Operations Intelligence Assistant.

${historyText}Current User Question: "${question}"
Verified Data Facts from Engine: "${structuredFacts}"

STRICT GUIDELINES:
1. Carefully read and directly answer the user's specific question using executive business reasoning grounded strictly in the verified data facts.
2. STRICTLY USE ONLY the product names, SKU IDs, customer names, figures, and values listed in "Verified Data Facts from Engine". NEVER hallucinate external products (such as "PulseEnterprise Suite", "CloudCore Server", "DataGuard Gateway") or fake numbers.
3. NEVER render ASCII text bar charts, block characters (████), or Markdown code block charts (\`\`\`...\`\`\`). The UI automatically renders an interactive graphical Recharts component (Bar, Line, Area, or Pie chart) directly below your message when visual data is requested.
4. When the user asks for a chart or visual breakdown, provide a concise executive summary explaining the top trends, key highlights, and rankings based on the verified data facts, and inform them that the visual chart is rendered below.
5. ALWAYS BOLD ALL KEY METRICS, VALUES, PRODUCT NAMES, CUSTOMER NAMES, AND NUMBERS (e.g., **PKR 702.31M**, **Interactive Display 65 Inch**, **52 orders**).
6. Do NOT include conversational filler like "Based on dataset records...". State facts directly, cleanly, and authoritatively.`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 1000, temperature: 0.1 },
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          answer: fallbackAnswer,
          source: "PulseOps Data Engine",
        };
      }

      const resData = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const geminiText =
        resData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? fallbackAnswer;

      return {
        answer: geminiText,
        source: "Gemini 3.5 AI + PulseOps Data Engine",
      };
    } catch {
      return {
        answer: fallbackAnswer,
        source: "PulseOps Data Engine",
      };
    }
  });
