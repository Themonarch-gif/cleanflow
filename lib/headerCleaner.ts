export interface HeaderCleaningResult {
  originalColumns: string[];
  cleanedColumns: string[];
  renamedColumns: {
    from: string;
    to: string;
  }[];
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function cleanHeaders(
  columns: string[]
): HeaderCleaningResult {
  const used = new Set<string>();

  const cleanedColumns = columns.map((column) => {
    let cleaned = normalizeHeader(column);

    if (!cleaned) {
      cleaned = "column";
    }

    let uniqueName = cleaned;
    let counter = 2;

    while (used.has(uniqueName)) {
      uniqueName = `${cleaned}_${counter}`;
      counter++;
    }

    used.add(uniqueName);

    return uniqueName;
  });

  const renamedColumns = columns
    .map((column, index) => ({
      from: column,
      to: cleanedColumns[index],
    }))
    .filter((item) => item.from !== item.to);

  return {
    originalColumns: columns,
    cleanedColumns,
    renamedColumns,
  };
}