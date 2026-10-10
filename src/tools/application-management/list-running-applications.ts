import { tool } from "ai";
import z from "zod";
import { desktop } from "../../desktop";

export const listRunningApplications = tool({
  description:
    "List desktop applications currently detected  by terminator, including their names and process information.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const applications = desktop.applications();

      const runningApplications = applications.map((app) => ({
        name: app.name(),
        processName: app.processName(),
        processId: app.processId(),
        role: app.role(),
      }));

      return {
        success: true,
        count: runningApplications.length,
        applications: runningApplications,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        count: 0,
        applications: [],
        message: message,
      };
    }
  },
});
