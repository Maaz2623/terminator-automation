import { tool } from "ai";
import z from "zod";
import { desktop } from "../desktop";

export const getDesktopRoot = tool({
  description: "Get the root UI element of the desktop using Terminator.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const root = desktop.root();

      return {
        success: true,
        root: {
          name: root.name(),
          role: root.role(),
          processName: root.processName(),
          processId: root.processId(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        root: null,
        message: message,
      };
    }
  },
});
