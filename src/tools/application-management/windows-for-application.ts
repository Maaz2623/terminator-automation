import { tool } from "ai";
import z from "zod";
import { desktop } from "../../desktop";

export const windowsForApplication = tool({
  description:
    "List windows belonging to an application, matched by application name or process name.",

  inputSchema: z.object({
    applicationName: z
      .string()
      .describe(
        "Application name or process name, such as Visual Studio Code, Code, or opera.",
      ),
  }),

  execute: async ({ applicationName }) => {
    try {
      const applications = desktop.applications();

      const matchingWindows = applications
        .filter((app) => {
          const role = app.role()?.toLowerCase();
          const name = app.name()?.toLowerCase();
          const processName = app.processName()?.toLowerCase();
          const query = applicationName.toLowerCase();

          return (
            role === "window" &&
            (name?.includes(query) || processName === query)
          );
        })
        .map((window) => ({
          name: window.name(),
          processName: window.processName(),
          processId: window.processId(),
          role: window.role(),
        }));

      return {
        success: true,
        applicationName,
        count: matchingWindows.length,
        windows: matchingWindows,
        message:
          matchingWindows.length > 0
            ? `Found ${matchingWindows.length} matching window(s).`
            : `No matching windows found for "${applicationName}".`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        applicationName,
        count: 0,
        windows: [],
        message,
      };
    }
  },
});
