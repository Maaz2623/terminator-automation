import { tool } from "ai";
import { z } from "zod";
import { desktop } from "../../desktop";

export const typeTextTool = tool({
  description:
    "Type text into a specified UI element. Use getWindowTreeResult first to identify the exact element and its role and name. Set clearBeforeTyping to true when replacing existing text.",

  inputSchema: z.object({
    process: z
      .string()
      .describe("Target application process name, such as Code or opera."),

    role: z
      .string()
      .describe("UI element role from the UI tree, such as Edit or TextBox."),

    name: z
      .string()
      .describe("Accessible name of the target element from the UI tree."),

    text: z.string().describe("The text to type into the target element."),

    clearBeforeTyping: z
      .boolean()
      .default(false)
      .describe("Whether to clear the existing text before typing."),
  }),

  execute: async ({ process, role, name, text, clearBeforeTyping }) => {
    try {
      const element = await desktop
        .locator(`process:${process}`)
        .locator(`role:${role}`)
        .first(5000);

      const result = await element.typeText(text, {
        clearBeforeTyping,
      });

      return {
        success: true,
        process,
        role,
        name,
        textTyped: text,
        clearBeforeTyping,
        result,
      };
    } catch (error) {
      return {
        success: false,
        process,
        role,
        name,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
