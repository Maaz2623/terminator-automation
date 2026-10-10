import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-3.5-flash-lite";

async function main() {
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Gemini API key not found in .env");
  }

  const ai = new GoogleGenAI({ apiKey });

  const files = [
    {
      label: "Original UI tree",
      file: path.resolve("ui-tree.json"),
    },
    {
      label: "Formatted UI tree",
      file: path.resolve("ui-tree-dump.txt"),
    },
  ];

  const results: { label: string; tokens: number }[] = [];

  for (const item of files) {
    const contents = await readFile(item.file, "utf8");

    const result = await ai.models.countTokens({
      model: MODEL,
      contents,
    });

    const tokens = result.totalTokens ?? 0;
    results.push({ label: item.label, tokens });

    console.log(`\n${item.label}`);
    console.log(`Characters: ${contents.length.toLocaleString()}`);
    console.log(`Tokens: ${tokens.toLocaleString()}`);
  }

  const original = results[0].tokens;
  const compact = results[1].tokens;

  if (original > 0) {
    const reduction = ((original - compact) / original) * 100;

    console.log("\n--- TOKEN REDUCTION REPORT ---");
    console.log(`Original:  ${original.toLocaleString()}`);
    console.log(`Formatted: ${compact.toLocaleString()}`);
    console.log(`Saved:     ${(original - compact).toLocaleString()} tokens`);
    console.log(`Reduction: ${reduction.toFixed(2)}%`);
  }
}

main().catch(console.error);
