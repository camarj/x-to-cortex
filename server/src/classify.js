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

Responde SOLO JSON válido con este schema, sin markdown ni code fences:
{"category": "ai|software-dev|product|finance|other", "translated": "texto en español o null"}

NO envuelvas la respuesta en bloques \`\`\`json ni comentarios. Solo el JSON crudo.`;

/**
 * Clasifica y traduce un tweet o hilo.
 * Robusto ante respuestas mal formadas: si no se puede parsear, devuelve "other".
 */
export async function classifyAndTranslate(text) {
  const res = await client.messages.create({
    model: config.claudeModel,
    max_tokens: 2048,
    system: SYSTEM,
    messages: [
      { role: "user", content: text },
      // Prefill: fuerza a Claude a continuar desde "{" → respuesta empieza como JSON
      { role: "assistant", content: "{" },
    ],
  });

  const raw = res.content[0]?.type === "text" ? res.content[0].text : "";
  // Re-componer el JSON prefillado
  const reconstructed = "{" + raw;
  // Sanitizar por si acaso llegan code fences
  const cleaned = reconstructed
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!["ai", "software-dev", "product", "finance", "other"].includes(parsed.category)) {
      throw new Error(`invalid category: ${parsed.category}`);
    }
    return parsed;
  } catch (err) {
    // Fallback: en lugar de crashear, logear y tratar como "other"
    console.warn("[classify] fallback to 'other'. raw:", raw.slice(0, 200));
    return { category: "other", translated: null };
  }
}
