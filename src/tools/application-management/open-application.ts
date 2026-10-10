import { tool } from "ai";
import z from "zod";
import { desktop } from "../../desktop";

export const openApplication = tool({
  description:
    "Open a desktop application by its name, such as Notepad, Calculator, or Visual Studio Code.",
  inputSchema: z.object({
    applicationName: z
      .string()
      .describe("The name of the desktop application to open."),
  }),
  execute: async ({ applicationName }) => {
    try {
      const application = desktop.openApplication(applicationName);

      return {
        success: true,
        applicationName,
        message: `Requested to open ${applicationName}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        applicationName,
        message: `Failed to open ${applicationName}: ${message}`,
      };
    }
  },
});
