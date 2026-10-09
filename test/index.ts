import { localBrowser, Stagehand } from "@browserbasehq/stagehand";
import { Bot } from "grammy";
import "dotenv/config";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// ============================================================
// CONFIG
// ============================================================

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN in .env");
}

if (!GOOGLE_API_KEY) {
  throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY in .env");
}

// Your Telegram numeric user ID.
//
// .env:
// TELEGRAM_ALLOWED_USER_IDS=123456789
//
// Multiple users:
// TELEGRAM_ALLOWED_USER_IDS=123456789,987654321

const ALLOWED_USER_IDS = new Set(
  (process.env.TELEGRAM_ALLOWED_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
);

// ============================================================
// TELEGRAM BOT
// ============================================================

const bot = new Bot(TELEGRAM_BOT_TOKEN);

// ============================================================
// TYPES
// ============================================================

type AgentStatus =
  | "starting"
  | "ready"
  | "busy"
  | "stopping"
  | "stopped"
  | "error";

// ============================================================
// STATE
// ============================================================

let browser: Awaited<ReturnType<typeof localBrowser.launch>> | null = null;

let stagehand: Stagehand | null = null;

let status: AgentStatus = "starting";

let shuttingDown = false;

// Ensures only one AI browser command runs at a time.
let agentQueue: Promise<unknown> = Promise.resolve();

// ============================================================
// AUTHORIZATION
// ============================================================

function isAuthorized(userId: number | undefined): boolean {
  if (!userId) {
    return false;
  }

  // If no IDs are configured, nobody gets access.
  if (ALLOWED_USER_IDS.size === 0) {
    return false;
  }

  return ALLOWED_USER_IDS.has(String(userId));
}

// ============================================================
// AGENT QUEUE
// ============================================================

function queueAgent<T>(task: () => Promise<T>): Promise<T> {
  const next = agentQueue.then(task, task);

  // Keep the queue alive if the previous
  // command failed.
  agentQueue = next.catch(() => undefined);

  return next;
}

// ============================================================
// INITIALIZE BROWSER
// ============================================================

async function initializeBrowser(): Promise<void> {
  if (stagehand) {
    return;
  }

  status = "starting";

  console.log("\n=================================");
  console.log(" Starting browser...");
  console.log("=================================\n");

  browser = await localBrowser.launch();

  stagehand = await Stagehand.create({
    browser,

    model: {
      modelName: "google/gemini-flash-lite-latest",
      apiKey: GOOGLE_API_KEY,
    },

    cache: {
      threshold: 1,
    },
  });

  // IMPORTANT:
  // pages() returns Promise<Page[]>
  // so we MUST await it.

  const pages = await browser.context.pages();

  const page = pages[0];

  if (!page) {
    throw new Error("Browser started but no page was found.");
  }

  await page.goto("https://www.google.com");

  status = "ready";

  console.log("\n=================================");
  console.log(" Browser ready");
  console.log("=================================\n");
}

// ============================================================
// RUN AGENT
// ============================================================

async function runAgent(command: string) {
  if (!stagehand) {
    throw new Error("Browser agent is not initialized.");
  }

  const cleanCommand = command.trim();

  if (!cleanCommand) {
    throw new Error("Command is empty.");
  }

  return queueAgent(async () => {
    status = "busy";

    console.log("\n---------------------------------");

    console.log("COMMAND:");

    console.log(cleanCommand);

    console.log("---------------------------------\n");

    try {
      const result = await stagehand!.act(cleanCommand);

      console.log("Agent > Action completed.");

      if (result) {
        console.log("Agent >", result);
      }

      return result;
    } catch (error) {
      console.error("Agent error:", error);

      throw error;
    } finally {
      if (!shuttingDown) {
        status = "ready";
      }
    }
  });
}

// ============================================================
// FORMAT RESULT
// ============================================================

function formatResult(result: unknown): string {
  if (result === undefined || result === null || result === "") {
    return "Action completed.";
  }

  if (typeof result === "string") {
    return result;
  }

  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

// ============================================================
// TELEGRAM MESSAGE LIMIT
// ============================================================

function limitTelegramMessage(text: string, maxLength = 3900): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength) + "\n\n…response truncated";
}

// ============================================================
// STATUS
// ============================================================

function getStatusText(): string {
  switch (status) {
    case "starting":
      return "🟡 Starting";

    case "ready":
      return "🟢 Ready";

    case "busy":
      return "🔵 Busy";

    case "stopping":
      return "🟠 Stopping";

    case "stopped":
      return "🔴 Stopped";

    case "error":
      return "🔴 Error";

    default:
      return "❓ Unknown";
  }
}

// ============================================================
// TEXT COMMAND
// ============================================================
//
// IMPORTANT:
// No manual grammY Context type here.
//
// We let bot.on() infer the correct filtered context.
// ============================================================

async function handleText(ctx: any, command: string): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId)) {
    console.warn(`Unauthorized user: ${userId ?? "unknown"}`);

    await ctx.reply("⛔ You are not authorized to control this browser.");

    return;
  }

  const cleanCommand = command.trim();

  if (!cleanCommand) {
    await ctx.reply("Please send me a command.");

    return;
  }

  if (!stagehand) {
    await ctx.reply("⏳ Browser is still starting.");

    return;
  }

  const processing = await ctx.reply("🤖 Working...");

  try {
    const result = await runAgent(cleanCommand);

    const resultText = limitTelegramMessage(
      `✅ Done\n\n${formatResult(result)}`,
    );

    await ctx.api.editMessageText(
      ctx.chat.id,
      processing.message_id,
      resultText,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error("Text command failed:", error);

    if (stagehand) {
      status = "ready";
    } else {
      status = "error";
    }

    await ctx.api.editMessageText(
      ctx.chat.id,
      processing.message_id,
      limitTelegramMessage(`❌ Agent error\n\n${message}`),
    );
  }
}

// ============================================================
// GEMINI VOICE TRANSCRIPTION
// ============================================================

async function transcribeVoice(audioPath: string): Promise<string> {
  const audio = await fs.readFile(audioPath);

  const base64Audio = audio.toString("base64");

  // GOOGLE_API_KEY has already been
  // checked at startup, but TypeScript
  // still sees the original env value
  // as string | undefined.
  //
  // This constant is therefore guaranteed
  // to be a string.

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(
      apiKey as string,
    )}`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: "audio/ogg",
                  data: base64Audio,
                },
              },

              {
                text:
                  "Transcribe this audio. " +
                  "Return only the spoken words. " +
                  "Do not explain, summarize, or add commentary.",
              },
            ],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Gemini transcription failed: ${response.status} ${errorText}`,
    );
  }

  const data: unknown = await response.json();

  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid Gemini response.");
  }

  const responseData = data as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  const parts = responseData.candidates?.[0]?.content?.parts;

  if (!parts) {
    throw new Error("Gemini returned no transcription.");
  }

  const text = parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Could not transcribe the voice message.");
  }

  return text;
}

// ============================================================
// VOICE COMMAND
// ============================================================

async function handleVoice(ctx: any): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId)) {
    console.warn(`Unauthorized voice user: ${userId ?? "unknown"}`);

    await ctx.reply("⛔ You are not authorized to control this browser.");

    return;
  }

  const voice = ctx.msg?.voice;

  if (!voice) {
    return;
  }

  const processing = await ctx.reply("🎤 Transcribing...");

  let tempFile: string | null = null;

  try {
    // --------------------------------------------------------
    // GET TELEGRAM FILE
    // --------------------------------------------------------

    const file = await ctx.getFile();

    if (!file.file_path) {
      throw new Error("Telegram did not provide a file path.");
    }

    // --------------------------------------------------------
    // TEMP FILE
    // --------------------------------------------------------

    tempFile = path.join(os.tmpdir(), `telegram-voice-${Date.now()}.ogg`);

    // --------------------------------------------------------
    // DOWNLOAD
    // --------------------------------------------------------

    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    const downloadResponse = await fetch(fileUrl);

    if (!downloadResponse.ok) {
      throw new Error(
        `Telegram voice download failed: ${downloadResponse.status}`,
      );
    }

    const audioBuffer = Buffer.from(await downloadResponse.arrayBuffer());

    await fs.writeFile(tempFile, audioBuffer);

    // --------------------------------------------------------
    // TRANSCRIBE
    // --------------------------------------------------------

    const transcription = await transcribeVoice(tempFile);

    console.log("\nVOICE COMMAND:");

    console.log(transcription);

    await ctx.api.editMessageText(
      ctx.chat.id,
      processing.message_id,
      limitTelegramMessage(`🎤 ${transcription}\n\n🤖 Executing...`),
    );

    // --------------------------------------------------------
    // EXECUTE
    // --------------------------------------------------------

    const result = await runAgent(transcription);

    await ctx.api.editMessageText(
      ctx.chat.id,
      processing.message_id,
      limitTelegramMessage(
        `🎤 ${transcription}\n\n` + `✅ Done\n\n` + formatResult(result),
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error("Voice command failed:", error);

    await ctx.api.editMessageText(
      ctx.chat.id,
      processing.message_id,
      limitTelegramMessage(`❌ Voice command failed\n\n${message}`),
    );
  } finally {
    if (tempFile) {
      try {
        await fs.unlink(tempFile);
      } catch {
        // Ignore cleanup errors.
      }
    }
  }
}

// ============================================================
// /START
// ============================================================

bot.command("start", async (ctx) => {
  if (!isAuthorized(ctx.from?.id)) {
    await ctx.reply("⛔ You are not authorized to control this browser.");

    return;
  }

  await ctx.reply(
    [
      "🤖 AI Browser Controller",
      "",
      "Send me a natural-language command.",
      "",
      "Examples:",
      "• Open Google",
      "• Search YouTube for JavaScript Mastery",
      "• Open the first result",
      "• Scroll down",
      "• Go back",
      "",
      "🎤 Voice messages are supported.",
      "",
      "Commands:",
      "/status",
      "/stop",
    ].join("\n"),
  );
});

// ============================================================
// /STATUS
// ============================================================

bot.command("status", async (ctx) => {
  if (!isAuthorized(ctx.from?.id)) {
    await ctx.reply("⛔ You are not authorized.");

    return;
  }

  await ctx.reply(
    [
      "🤖 Browser Agent",
      "",
      `Status: ${getStatusText()}`,
      `Browser: ${browser ? "initialized" : "not initialized"}`,
      `Stagehand: ${stagehand ? "initialized" : "not initialized"}`,
    ].join("\n"),
  );
});

// ============================================================
// /STOP
// ============================================================

bot.command("stop", async (ctx) => {
  if (!isAuthorized(ctx.from?.id)) {
    await ctx.reply("⛔ You are not authorized.");

    return;
  }

  await ctx.reply("🛑 Stopping browser...");

  await shutdown();

  await ctx.reply("✅ Browser stopped.");
});

// ============================================================
// TEXT
// ============================================================

bot.on("message:text", async (ctx) => {
  await handleText(ctx, ctx.msg.text);
});

// ============================================================
// VOICE
// ============================================================

bot.on("message:voice", async (ctx) => {
  await handleVoice(ctx);
});

// ============================================================
// TELEGRAM ERRORS
// ============================================================

bot.catch((error) => {
  console.error("Telegram error:", error.error);
});

// ============================================================
// SHUTDOWN
// ============================================================

async function shutdown(): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  status = "stopping";

  console.log("\nShutting down...");

  // ----------------------------------------------------------
  // STOP TELEGRAM
  // ----------------------------------------------------------

  try {
    bot.stop();
  } catch {
    // Ignore.
  }

  // ----------------------------------------------------------
  // CLOSE STAGEHAND
  // ----------------------------------------------------------

  if (stagehand) {
    try {
      await stagehand.close();
    } catch (error) {
      console.error("Stagehand shutdown error:", error);
    }
  }

  // ----------------------------------------------------------
  // CLOSE BROWSER
  // ----------------------------------------------------------

  if (browser) {
    try {
      await browser.close();
    } catch (error) {
      console.error("Browser shutdown error:", error);
    }
  }

  stagehand = null;
  browser = null;

  status = "stopped";

  console.log("Browser closed.");
}

// ============================================================
// PROCESS SIGNALS
// ============================================================

process.once("SIGINT", async () => {
  await shutdown();
  process.exit(0);
});

process.once("SIGTERM", async () => {
  await shutdown();
  process.exit(0);
});

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  console.log("=================================");

  console.log(" AI TELEGRAM BROWSER CONTROLLER");

  console.log("=================================\n");

  if (ALLOWED_USER_IDS.size === 0) {
    console.warn("⚠️ TELEGRAM_ALLOWED_USER_IDS is not configured.");

    console.warn("All Telegram users will be rejected.");

    console.warn("Add your Telegram numeric user ID to .env.\n");
  }

  await initializeBrowser();

  console.log("Starting Telegram bot...\n");

  await bot.start({
    onStart: (botInfo) => {
      console.log(`Telegram bot @${botInfo.username} is running.`);

      console.log("Waiting for commands...\n");
    },
  });
}

// ============================================================
// START
// ============================================================

main().catch(async (error) => {
  console.error("\nFATAL ERROR:", error);

  status = "error";

  await shutdown();

  process.exit(1);
});
