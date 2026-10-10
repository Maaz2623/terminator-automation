import { tool } from "ai";
import z from "zod";
import { desktop } from "../../desktop";
import * as Terminator from "@mediar-ai/terminator";
import path from "node:path";
import { writeFile } from "node:fs/promises";

export const getWindowTreeResult = tool({
  description:
    "Get the formatted desktop UI tree for a specified application window.",
  inputSchema: z.object({
    process: z.string().describe("Process name, such as Code or opera."),
    title: z.string().optional().describe("Optional window title."),
  }),
  execute: async ({ process, title }) => {
    try {
      const result = desktop.getWindowTreeResult(process, title, {
        formatOutput: true,
        propertyMode: Terminator.PropertyLoadingMode.Smart,
        treeOutputFormat: Terminator.TreeOutputFormat.CompactYaml,
      });

      return {
        success: true,
        process,
        title: title ?? null,
        formatted: result.formatted,
      };
    } catch (error) {
      return {
        success: false,
        process,
        title: title ?? null,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
