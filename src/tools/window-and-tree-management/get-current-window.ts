import { tool } from "ai";
import z from "zod";
import { desktop } from "../../desktop";

export const getCurrentWindow = tool({
  description:
    "Get the currently focused desktop window and return its name, role, and process ID",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const window = await desktop.getCurrentWindow();

      return {
        success: true,
        window: {
          name: window.name(),
          role: window.role(),
          processName: window.processName(),
          processId: window.processId(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        window: null,
        message,
      };
    }
  },
});
