import { desktop } from "./src/desktop";

const applications = await desktop.getAllApplicationsTree();

console.log(JSON.stringify(applications, null, 2));
