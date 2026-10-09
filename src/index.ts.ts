import { generateText, stepCountIs } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import "dotenv/config";

import { listRunningApplications } from "./tools/list-running-applications";
import { getDesktopRoot } from "./tools/get-desktop-root";
import { openApplication } from "./tools/open-application";
import { instructions } from "./instructions";
import { activateApplication } from "./tools/activate-application";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

async function main() {
  const { text, steps } = await generateText({
    model: google("gemini-3.5-flash-lite"),

    instructions: instructions,

    prompt: "Switch to the currently running browser and bring it into focus.",

    tools: {
      listRunningApplications,
      getDesktopRoot,
      openApplication,
      activateApplication,
    },

    stopWhen: stepCountIs(5),
  });

  console.log("\nAssistant:", text);

  for (const step of steps) {
    if (step.toolCalls.length > 0) {
      console.log("\nTool calls:", step.toolCalls);
    }

    if (step.toolResults.length > 0) {
      console.log("\nTool results:", step.toolResults);
    }
  }
}

main().catch(console.error);
