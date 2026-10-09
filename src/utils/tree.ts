export interface UIElementSummary {
  id: string;
  name: string;
  role: string;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface UITreeNode {
  id?: string | number;
  attributes?: {
    name?: string | null;
    role?: string | null;
    bounds?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  children?: UITreeNode[];
}

export function flattenUITree(tree: unknown): UIElementSummary[] {
  const elements: UIElementSummary[] = [];

  function visit(node: UITreeNode): void {
    const name = node.attributes?.name?.trim() ?? "";
    const role = node.attributes?.role?.trim() ?? "";

    if (name && role) {
      elements.push({
        id: String(node.id ?? ""),
        name,
        role,
        bounds: node.attributes?.bounds,
      });
    }

    for (const child of node.children ?? []) {
      visit(child);
    }
  }

  if (tree && typeof tree === "object") {
    visit(tree as UITreeNode);
  }

  return elements;
}
