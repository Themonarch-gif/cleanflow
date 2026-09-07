import { CSVRow } from "./analyzer";

export interface CleaningOptions {
  removeDuplicates: boolean;
  trimWhitespace: boolean;
  normalizeCapitalization: boolean;
  lowercaseEmails: boolean;
  normalizePhones: boolean;
  removeEmptyColumns: boolean;
  removeEmptyRows: boolean;
  duplicateMode: "row" | "email" | "phone";
}

export interface CleaningResult {
  cleanedData: CSVRow[];
  removedDuplicates: number;
  trimmedCells: number;
  normalizedCells: number;
  removedColumns: string[];
  removedEmptyRows: number;
}

export function cleanCSV(
  data: CSVRow[],
  columns: string[],
  options: CleaningOptions
): CleaningResult {
  let trimmedCells = 0;
  let normalizedCells = 0;
  let removedEmptyRows = 0;

  let workingData = [...data];

  // ----------------------------------------
  // 1. Remove completely empty rows
  // ----------------------------------------

  if (options.removeEmptyRows) {
    const before = workingData.length;

    workingData = workingData.filter((row) => {
      return columns.some(
        (column) =>
          String(row[column] ?? "").trim() !== ""
      );
    });

    removedEmptyRows =
      before - workingData.length;
  }

    // ----------------------------------------
  // 2. Remove duplicate rows
  // ----------------------------------------

  let removedDuplicates = 0;

  if (options.removeDuplicates) {
    const seen = new Set<string>();
    const uniqueRows: CSVRow[] = [];

    for (const row of workingData) {
      let signature = "";

      // ----------------------------------------
      // Duplicate by email
      // ----------------------------------------

      if (options.duplicateMode === "email") {
        const emailColumn = columns.find((column) =>
          column.toLowerCase().includes("email")
        );

        if (emailColumn) {
          const email = String(
            row[emailColumn] ?? ""
          )
            .trim()
            .toLowerCase();

          // Only use email as a duplicate key
          // when an email actually exists.
          if (email !== "") {
            signature = `email:${email}`;
          }
        }

        // If there is no usable email,
        // fall back to the entire row.
        if (signature === "") {
          signature = columns
            .map((column) =>
              String(row[column] ?? "")
                .trim()
                .toLowerCase()
            )
            .join("|");
        }
      }

      // ----------------------------------------
      // Duplicate by phone
      // ----------------------------------------

      else if (
        options.duplicateMode === "phone"
      ) {
        const phoneColumn = columns.find(
          (column) => {
            const name =
              column.toLowerCase();

            return (
              name.includes("phone") ||
              name.includes("mobile") ||
              name.includes("telephone")
            );
          }
        );

        if (phoneColumn) {
          const phone = String(
            row[phoneColumn] ?? ""
          ).replace(/\D/g, "");

          // Only use phone as a duplicate key
          // when a phone number actually exists.
          if (phone !== "") {
            signature = `phone:${phone}`;
          }
        }

        // If there is no usable phone number,
        // fall back to the entire row.
        if (signature === "") {
          signature = columns
            .map((column) =>
              String(row[column] ?? "")
                .trim()
                .toLowerCase()
            )
            .join("|");
        }
      }

      // ----------------------------------------
      // Duplicate by entire row
      // ----------------------------------------

      else {
        signature = columns
          .map((column) =>
            String(row[column] ?? "")
              .trim()
              .toLowerCase()
          )
          .join("|");
      }

      // ----------------------------------------
      // Check for duplicate
      // ----------------------------------------

      if (
        signature !== "" &&
        seen.has(signature)
      ) {
        removedDuplicates++;
        continue;
      }

      seen.add(signature);
      uniqueRows.push(row);
    }

    workingData = uniqueRows;
  }

  // ----------------------------------------
  // 3. Remove empty columns
  // ----------------------------------------

  const removedColumns: string[] = [];

  let usefulColumns = [...columns];

  if (options.removeEmptyColumns) {
    usefulColumns = columns.filter((column) => {
      const hasValue = workingData.some(
        (row) =>
          String(row[column] ?? "").trim() !== ""
      );

      if (!hasValue) {
        removedColumns.push(column);
        return false;
      }

      return true;
    });
  }

  // ----------------------------------------
  // 4. Clean individual cells
  // ----------------------------------------

  const cleanedData = workingData.map((row) => {
    const cleanedRow: CSVRow = {};

    for (const column of usefulColumns) {
      const originalValue = String(
        row[column] ?? ""
      );

      let finalValue = originalValue;

      // --------------------------------------
      // Trim whitespace
      // --------------------------------------

      if (options.trimWhitespace) {
        const trimmedValue =
          finalValue.trim();

        if (
          trimmedValue !== finalValue
        ) {
          trimmedCells++;
        }

        finalValue = trimmedValue;
      }

      const lowerColumn =
        column.toLowerCase();

      // --------------------------------------
      // Lowercase emails
      // --------------------------------------

      if (
        options.lowercaseEmails &&
        lowerColumn.includes("email") &&
        finalValue !== ""
      ) {
        const normalized =
          finalValue.toLowerCase();

        if (normalized !== finalValue) {
          normalizedCells++;
          finalValue = normalized;
        }
      }

     // Normalize phone numbers
if (
  options.normalizePhones &&
  (
    lowerColumn.includes("phone") ||
    lowerColumn.includes("mobile") ||
    lowerColumn.includes("telephone")
  ) &&
  finalValue !== ""
) {
  let normalized = finalValue.replace(/\D/g, "");

  // Nigeria-aware normalization
  if (normalized.startsWith("234")) {
    normalized = `+${normalized}`;
  } else if (
    normalized.startsWith("0") &&
    normalized.length === 11
  ) {
    normalized = `+234${normalized.slice(1)}`;
  } else if (
    normalized.length === 10
  ) {
    normalized = `+234${normalized}`;
  }

  if (normalized !== finalValue) {
    normalizedCells++;
    finalValue = normalized;
  }
}

      // --------------------------------------
      // Normalize ordinary text
      // --------------------------------------

      if (
        options.normalizeCapitalization &&
        !lowerColumn.includes("email") &&
        !lowerColumn.includes("phone") &&
        !lowerColumn.includes("mobile") &&
        !lowerColumn.includes("telephone") &&
        !lowerColumn.includes("number") &&
        !lowerColumn.includes("id") &&
        finalValue !== ""
      ) {
        const normalized =
          finalValue
            .toLowerCase()
            .split(/\s+/)
            .map((word) => {
              if (!word) return word;

              return (
                word.charAt(0).toUpperCase() +
                word.slice(1)
              );
            })
            .join(" ");

        if (normalized !== finalValue) {
          normalizedCells++;
          finalValue = normalized;
        }
      }

      cleanedRow[column] = finalValue;
    }

    return cleanedRow;
  });

  return {
    cleanedData,
    removedDuplicates,
    trimmedCells,
    normalizedCells,
    removedColumns,
    removedEmptyRows,
  };
}

// --------------------------------------------
// Convert cleaned data back to CSV
// --------------------------------------------

export function convertToCSV(
  data: CSVRow[],
  columns: string[]
): string {
  const escapeCSVValue = (
    value: string
  ): string => {
    const stringValue = String(
      value ?? ""
    );

    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n")
    ) {
      return `"${stringValue.replace(
        /"/g,
        '""'
      )}"`;
    }

    return stringValue;
  };

  const header = columns
    .map(escapeCSVValue)
    .join(",");

  const rows = data.map((row) =>
    columns
      .map((column) =>
        escapeCSVValue(
          row[column] ?? ""
        )
      )
      .join(",")
  );

  return [header, ...rows].join("\n");
}