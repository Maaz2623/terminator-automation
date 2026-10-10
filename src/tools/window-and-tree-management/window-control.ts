import { tool } from "ai";
import { z } from "zod";
import { desktop } from "../../desktop";

export const windowControl = tool({
  description: `
Control the currently focused application's window.

Supported actions:
- activateWindow: Activate the containing window.
- minimizeWindow: Minimize the containing window.
- maximizeWindow: Maximize the containing window.
- setTransparency: Set window transparency from 0 to 100.
- close: Close the current application element or its window.

Only provide percentage for setTransparency.
No process, role, or element name is required.
`,

  inputSchema: z.object({
    action: z.enum([
      "activateWindow",
      "minimizeWindow",
      "maximizeWindow",
      "setTransparency",
      "close",
    ]),

    applicationName: z
      .string()
      .describe("The name of the application to perform the action on."),

    percentage: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe("Transparency percentage from 0 to 100."),
  }),

  execute: async ({ action, percentage, applicationName }) => {
    try {
      if (action === "setTransparency" && percentage === undefined) {
        return {
          success: false,
          action,
          message: "percentage is required for setTransparency.",
        };
      }

      const element = await desktop.application(applicationName);

      switch (action) {
        case "activateWindow":
          element.activateWindow();
          break;

        case "minimizeWindow":
          element.minimizeWindow();
          break;

        case "maximizeWindow":
          element.maximizeWindow();
          break;

        case "setTransparency":
          element.setTransparency(percentage!);
          break;

        case "close":
          element.close();
          break;
      }

      return {
        success: true,
        action,
        ...(action === "setTransparency" ? { percentage } : {}),
        message: `${action} executed on the current application.`,
      };
    } catch (error) {
      return {
        success: false,
        action,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
