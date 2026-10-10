import { tool } from "ai";
import z from "zod";
import { desktop } from "../../desktop";

export const activateBrowserWindowByTitle = tool({
  description:
    "Activate a browser window by its exact or partial title. Use this when the user wants to switch to a specific browser window.",
  inputSchema: z.object({
    title: z.string().describe("The title of the browser window to activate."),
  }),
  execute: async ({ title }) => {
    try {
      desktop.activateBrowserWindowByTitle(title);

      return {
        success: true,
        title,
        message: `Activation requested for browser window "${title}".`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        title,
        message,
      };
    }
  },
});
