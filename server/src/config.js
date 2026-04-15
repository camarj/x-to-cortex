import "dotenv/config";
import path from "node:path";

export const config = {
  port: Number(process.env.PORT || 7777),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  claudeModel: process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001",
  cortexRawPath: process.env.CORTEX_RAW_PATH || path.join(process.env.HOME, "Documents/Cortex/raw"),
  bookmarksDir: "x-bookmarks",
  validCategories: ["ai", "software-dev", "product", "finance"]
};

if (!config.anthropicApiKey) {
  console.warn("[config] ANTHROPIC_API_KEY missing — classification will fail");
}
