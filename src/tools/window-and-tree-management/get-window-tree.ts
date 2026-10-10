import { tool } from "ai";
import z from "zod";
import type { UINode } from "@mediar-ai/terminator";
import { desktop } from "../../desktop";

export const getWindowTree = tool({
  description:
    "Get a compact summary of the UI tree for a window belonging to a process. Returns UI element IDs, roles, names, and hierarchy depth.",
  inputSchema: z.object({
    process: z.string().describe("Process name, such as Code or opera."),
    title: z
      .string()
      .optional()
      .describe("Optional window title to identify a specific window."),
  }),
  execute: async ({ process, title }) => {
    try {
      const tree: UINode = desktop.getWindowTree(process, title);

      const elements: Array<{
        id: string | null;
        role: string | null;
        name: string | null;
        depth: number;
      }> = [];

      const visit = (node: UINode, depth: number): void => {
        elements.push({
          id: node.id ?? null,
          role: node.attributes?.role ?? null,
          name: node.attributes?.name ?? null,
          depth,
        });

        for (const child of node.children ?? []) {
          visit(child, depth + 1);
        }
      };

      visit(tree, 0);

      const limit = 100;

      return {
        success: true,
        process,
        title: title ?? null,
        elementCount: elements.length,
        elements: elements.slice(0, limit),
        truncated: elements.length > limit,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        process,
        title: title ?? null,
        elementCount: 0,
        elements: [],
        truncated: false,
        message,
      };
    }
  },
});
