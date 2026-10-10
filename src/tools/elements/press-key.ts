import { tool } from "ai";
import { z } from "zod";
import { desktop } from "../../desktop";

export const pressKey = tool({
  description:
    "Press a key on a specified UI element. Use Terminator's supported key syntax, such as {Enter}, {Tab}, or {Escape}.",

  inputSchema: z.object({
    process: z.string().describe("Application process, e.g. Code."),
    role: z.string().describe("Target element role from the UI tree."),
    name: z.string().describe("Target element name from the UI tree."),
    key: z.string().describe("Key in Terminator-supported format."),
  }),

  execute: async ({ process, role, name, key }) => {
    try {
      const element = await desktop
        .locator(`process:${process}`)
        .locator(`role:${role}`)
        .first(5000);

      const result = await element.pressKey(key);

      return {
        success: true,
        process,
        role,
        name,
        key,
        result,
      };
    } catch (error) {
      return {
        success: false,
        process,
        role,
        name,
        key,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
