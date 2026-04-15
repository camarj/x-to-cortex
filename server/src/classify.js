import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";

const client = new Anthropic({ apiKey: config.anthropicApiKey });

const SYSTEM = `Eres un clasificador de tweets para un knowledge base personal.

Tareas:
1. Clasificar en UNA de estas categorías: "ai", "software-dev", "product", "finance", "other".
2. Si la categoría NO es "other", traducir el texto al español (natural, no literal). Si ya está en español, devuelve el mismo texto.

Definiciones:
- ai: inteligencia artificial, LLMs, agentes, ML, RAG, prompting, modelos, herramientas IA
- software-dev: programación, arquitectura, DevOps, testing, lenguajes, frameworks, git, bases de datos
- product: product management, UX, design, growth, estrategia de producto, research
- finance: finanzas personales/corporativas, inversión, economía, mercados, valuations
- other: cualquier otra cosa (política, memes, lifestyle, deportes, personal)

Responde SOLO JSON válido con este schema:
{"category": "ai|software-dev|product|finance|other", "translated": "texto en español o null"}`;

/**
 * Clasifica y traduce un tweet o hilo.
 * @param {string} text - texto original (un tweet o un hilo concatenado)
 * @returns {Promise<{category: string, translated: string | null}>}
 */
export async function classifyAndTranslate(text) {
  // TODO: manejar rate limits con retry exponencial
  const res = await client.messages.create({
    model: config.claudeModel,
    max_tokens: 2048,
    system: SYSTEM,
    messages: [{ role: "user", content: text }]
  });

  const raw = res.content[0]?.type === "text" ? res.content[0].text : "";
  try {
    const parsed = JSON.parse(raw);
    if (!["ai", "software-dev", "product", "finance", "other"].includes(parsed.category)) {
      throw new Error(`invalid category: ${parsed.category}`);
    }
    return parsed;
  } catch (err) {
    console.error("[classify] failed to parse:", raw);
    throw err;
  }
}
