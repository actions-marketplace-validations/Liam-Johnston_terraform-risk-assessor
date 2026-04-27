import { z } from "zod";

const ProviderName = z.enum(["openai", "anthropic", "gemini"]);
type ProviderName = z.infer<typeof ProviderName>;

interface CompletionRequest {
  systemPrompt: string;
  userPrompt: string;
}

interface CompletionResponse {
  content: string;
}

interface AIProvider {
  name: ProviderName;
  complete: (req: CompletionRequest) => Promise<CompletionResponse>;
}

const createOpenAIProvider = (apiKey: string, model: string): AIProvider => ({
  name: "openai",
  complete: async ({ systemPrompt, userPrompt }) => {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${body}`);
    }

    const data = await res.json();
    return { content: data.choices[0].message.content };
  },
});

const createAnthropicProvider = (apiKey: string, model: string): AIProvider => ({
  name: "anthropic",
  complete: async ({ systemPrompt, userPrompt }) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${body}`);
    }

    const data = await res.json();
    return { content: data.content[0].text };
  },
});

const createGeminiProvider = (apiKey: string, model: string): AIProvider => ({
  name: "gemini",
  complete: async ({ systemPrompt, userPrompt }) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${body}`);
    }

    const data = await res.json();
    return { content: data.candidates[0].content.parts[0].text };
  },
});

export const createProvider = (provider: string, apiKey: string, model: string): AIProvider => {
  const parsed = ProviderName.parse(provider);

  switch (parsed) {
    case "openai":
      return createOpenAIProvider(apiKey, model);
    case "anthropic":
      return createAnthropicProvider(apiKey, model);
    case "gemini":
      return createGeminiProvider(apiKey, model);
  }
};

export type { AIProvider, CompletionRequest, CompletionResponse };
