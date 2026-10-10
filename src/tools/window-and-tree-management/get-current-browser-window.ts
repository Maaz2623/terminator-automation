import { tool } from "ai";
import z from "zod";
import { desktop } from "../../desktop";

export const getCurrentBrowserWindow = tool({
  description:
    "Get the current browser window element and return its name, role, process name, and process ID.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const browserWindow = await desktop.getCurrentBrowserWindow();

      return {
        success: true,
        browserWindow: {
          name: browserWindow.name(),
          role: browserWindow.role(),
          processName: browserWindow.processName(),
          processId: browserWindow.processId(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        browserWindow: null,
        message,
      };
    }
  },
});
