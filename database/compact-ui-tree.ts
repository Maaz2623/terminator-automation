import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

type UIElement = {
  id?: string;
  attributes?: {
    role?: string;
    name?: string;
    [key: string]: unknown;
  };
  children?: UIElement[];
  [key: string]: unknown;
};

type CompactButton = {
  id: string;
  name: string;
};

function extractButtons(element: UIElement): CompactButton[] {
  const buttons: CompactButton[] = [];

  if (element.attributes?.role === "Button") {
    buttons.push({
      id: element.id ?? "",
      name: element.attributes.name ?? "",
    });
  }

  for (const child of element.children ?? []) {
    buttons.push(...extractButtons(child));
  }

  return buttons;
}

function countElements(element: UIElement): number {
  return (
    1 +
    (element.children ?? []).reduce(
      (total, child) => total + countElements(child),
      0,
    )
  );
}

async function main() {
  const root = process.cwd();
  const sourcePath = path.join(root, "ui-tree-dump.json");
  const databaseDir = path.join(root, "database");

  await mkdir(databaseDir, { recursive: true });

  const raw = await readFile(sourcePath, "utf8");
  const original = JSON.parse(raw) as { tree: UIElement };

  // Preserve the complete original tree locally.
  await writeFile(
    path.join(databaseDir, "ui-tree.json"),
    JSON.stringify(original, null, 2),
    "utf8",
  );

  // Keep only button IDs and names for the compact summary.
  const buttons = extractButtons(original.tree);

  const summary = {
    buttonCount: buttons.length,
    buttons,
  };

  const summaryText = JSON.stringify(summary);

  await writeFile(
    path.join(databaseDir, "ui-summary.json"),
    summaryText,
    "utf8",
  );

  console.log("Original elements:", countElements(original.tree));
  console.log("Buttons extracted:", buttons.length);
  console.log("Original characters:", raw.length);
  console.log("Compact characters:", summaryText.length);
  console.log("Saved:", path.join(databaseDir, "ui-summary.json"));
}

main().catch(console.error);
