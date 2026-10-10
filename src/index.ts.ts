import { streamText, stepCountIs, type ModelMessage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import "dotenv/config";
import * as readline from "node:readline/promises";

import { instructions } from "./instructions";

import { listRunningApplications } from "./tools/application-management/list-running-applications";
import { getDesktopRoot } from "./tools/application-management/get-desktop-root";
import { openApplication } from "./tools/application-management/open-application";
import { activateApplication } from "./tools/application-management/activate-application";
import { windowsForApplication } from "./tools/application-management/windows-for-application";

import { getCurrentWindow } from "./tools/window-and-tree-management/get-current-window";
import { getCurrentApplication } from "./tools/application-management/get-current-application";
import { getCurrentBrowserWindow } from "./tools/window-and-tree-management/get-current-browser-window";
import { activateBrowserWindowByTitle } from "./tools/window-and-tree-management/activate-browser-window-by-title";
import { getWindowTreeResult } from "./tools/window-and-tree-management/get-window-tree-result";

import { mouseInteraction } from "./tools/elements/mouse-interaction";
import { typeTextTool } from "./tools/elements/type-text";
import { pressKey } from "./tools/elements/press-key";
import { windowControl } from "./tools/window-and-tree-management/window-control";

// ============================================================
// CONFIGURATION
// ============================================================

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const model = google("gemini-3.5-flash-lite");

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Full conversation history, including tool interactions.
const messages: ModelMessage[] = [];

// ============================================================
// TERMINATOR TOOLS
// ============================================================

const tools = {
  listRunningApplications,
  getDesktopRoot,
  openApplication,
  activateApplication,
  windowsForApplication,

  getCurrentWindow,
  getCurrentApplication,
  getCurrentBrowserWindow,
  activateBrowserWindowByTitle,
  getWindowTreeResult,
  windowControl,
  mouseInteraction,
  typeTextTool,
  pressKey,
};

// ============================================================
// CHAT LOOP
// ============================================================

async function main() {
  console.log("\n========================================");
  console.log("       TERMINATOR DESKTOP AGENT");
  console.log("========================================");
  console.log("Chat with your desktop automation agent.");
  console.log("Commands: /clear, /exit\n");

  try {
    while (true) {
      let userInput: string;

      try {
        userInput = (await terminal.question("You: ")).trim();
      } catch {
        // Handles terminal input closing, such as Ctrl+D.
        break;
      }

      if (!userInput) {
        continue;
      }

      // --------------------------------------------------------
      // BUILT-IN CHAT COMMANDS
      // --------------------------------------------------------

      if (userInput === "/exit" || userInput === "/quit") {
        console.log("\nTerminator agent stopped.");
        break;
      }

      if (userInput === "/clear") {
        messages.length = 0;
        console.log("\nConversation history cleared.\n");
        continue;
      }

      // --------------------------------------------------------
      // ADD USER MESSAGE
      // --------------------------------------------------------

      messages.push({
        role: "user",
        content: userInput,
      });

      console.log("\nAssistant: ");

      try {
        // ------------------------------------------------------
        // STREAM MODEL RESPONSE AND EXECUTE TOOLS
        // ------------------------------------------------------

        const result = streamText({
          model,
          instructions,
          messages,
          tools,
          stopWhen: stepCountIs(50),

          // Log every tool call and its result
          onStepFinish({
            stepNumber,
            text,
            toolCalls,
            toolResults,
            finishReason,
          }) {
            console.log(`\n\n========== STEP ${stepNumber} ==========`);
            console.log("Finish reason:", finishReason);

            if (text) {
              console.log("\nGemini's text:");
              console.log(text);
            }

            if (toolCalls.length > 0) {
              console.log("\n--- TOOL CALLS ---");

              for (const call of toolCalls) {
                console.dir(
                  {
                    toolName: call.toolName,
                    toolCallId: call.toolCallId,
                    input: call.input,
                  },
                  { depth: null, colors: true },
                );
              }
            }

            if (toolResults.length > 0) {
              console.log("\n--- TOOL RESULTS ---");

              for (const result of toolResults) {
                console.dir(
                  {
                    toolName: result.toolName,
                    toolCallId: result.toolCallId,
                    output: result.output,
                  },
                  { depth: null, colors: true },
                );
              }
            }

            console.log("================================");
          },
        });

        for await (const delta of result.textStream) {
          process.stdout.write(delta);
        }

        process.stdout.write("\n\n");

        const response = await result.response;
        messages.push(...response.messages);
      } catch (error) {
        // Remove the unanswered user message so a failed request
        // does not leave the conversation in a misleading state.
        messages.pop();

        console.error(
          "\nRequest failed:",
          error instanceof Error ? error.message : error,
          "\n",
        );
      }
    }
  } finally {
    terminal.close();
  }
}

main().catch(console.error);
