import { tool } from "ai";
import z from "zod";
import { desktop } from "../../desktop";

export const getCurrentApplication = tool({
  description:
    "Get the currently focused desktop application and return its name, role, process name, and process ID.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const application = await desktop.getCurrentApplication();

      return {
        success: true,
        application: {
          name: application.name(),
          role: application.role(),
          processName: application.processName(),
          processId: application.processId(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        application: null,
        message,
      };
    }
  },
});
