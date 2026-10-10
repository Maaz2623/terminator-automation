import { tool } from "ai";
import { z } from "zod";
import { desktop } from "../../desktop";
import * as Terminator from "@mediar-ai/terminator";

export const mouseInteraction = tool({
  description: `
Click a UI element using its index from the latest UI tree.

Pass the process name and exact index returned by getWindowTreeResult.
Do not retrieve or rebuild the UI tree inside this tool.
Do not click the application window itself.
`,

  inputSchema: z.object({
    process: z
      .string()
      .describe("Process name, e.g. ApplicationFrameHost or Code."),
    index: z
      .number()
      .int()
      .positive()
      .describe("Exact index from the latest UI tree."),
  }),

  execute: async ({ process, index }) => {
    try {
      const result = desktop.clickByIndex(index, Terminator.VisionType.UiTree);

      return {
        success: true,
        action: "click",
        process,
        index,
        result,
      };
    } catch (error) {
      return {
        success: false,
        action: "click",
        process,
        index,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
