import { tool } from "ai";
import z from "zod";
import { desktop } from "../desktop";

export const activateApplication = tool({
  description:
    "Active and focus an application by its name. Use this when the user wants to switch to an application that is already running.",
  inputSchema: z.object({
    applicationName: z
      .string()
      .describe("The name of the application to activate or focus."),
  }),
  execute: async ({ applicationName }) => {
    try {
      desktop.activateApplication(applicationName);

      return {
        success: true,
        applicationName,
        message: `Activation requested for ${applicationName}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        applicationName,
        message: `Failed to activate ${applicationName}: ${message}`,
      };
    }
  },
});
