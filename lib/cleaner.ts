import { CSVRow } from "./analyzer";
import * as XLSX from "xlsx";

export interface CleaningOptions {
  removeDuplicates: boolean;
  trimWhitespace: boolean;
  normalizeCapitalization: boolean;
  lowercaseEmails: boolean;
  normalizePhones: boolean;
  standardizeDates: boolean;
  normalizeHeaders: boolean;
  removeEmptyColumns: boolean;
  removeEmptyRows: boolean;

  findText: string;
  replaceText: string;
  findCaseSensitive: boolean;
  findWholeCell: boolean;

  duplicateMode:
  | "row"
  | "email"
  | "phone"
  | "columns";

  duplicateColumns: string[];
}

export interface DuplicateGroup {
  key: string;
  columns: string[];
  rowIndexes: number[];
  count: number;
}

export interface CleaningResult {
  cleanedData: CSVRow[];
  removedDuplicates: number;
  trimmedCells: number;
  normalizedCells: number;
  normalizedEmails: number;
  normalizedPhones: number;
  normalizedText: number;
  standardizedDates: number;
  normalizedHeaders: number;
  findReplaceCount: number;
  removedColumns: string[];
  removedEmptyRows: number;
  duplicateGroups: DuplicateGroup[];
}

function formatDateParts(
  year: number,
  month: number,
  day: number
): string | null {
  if (
    year < 1000 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
}

function standardizeDate(
  value: string
): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  // Already ISO format.
  const isoMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (isoMatch) {
    return formatDateParts(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3])
    );
  }

  // Unambiguous YYYY/MM/DD or YYYY-MM-DD.
  const yearFirstMatch = trimmed.match(
    /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/
  );

  if (yearFirstMatch) {
    return formatDateParts(
      Number(yearFirstMatch[1]),
      Number(yearFirstMatch[2]),
      Number(yearFirstMatch[3])
    );
  }

  // Unambiguous DD/MM/YYYY or DD-MM-YYYY
  // where the first number is greater than 12.
  const dayFirstMatch = trimmed.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
  );

  if (dayFirstMatch) {
    const first = Number(dayFirstMatch[1]);
    const second = Number(dayFirstMatch[2]);
    const year = Number(dayFirstMatch[3]);

    if (first > 12 && second <= 12) {
      return formatDateParts(
        year,
        second,
        first
      );
    }

    // If the second number is greater than 12,
    // the format must be MM/DD/YYYY.
    if (second > 12 && first <= 12) {
      return formatDateParts(
        year,
        first,
        second
      );
    }

    // 03/04/2026 is ambiguous.
    // Do not guess.
    return null;
  }

  // Month-name dates.
  const timestamp = Date.parse(trimmed);

  if (Number.isNaN(timestamp)) {
    return null;
  }

  const date = new Date(timestamp);

  return formatDateParts(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function cleanCSV(
  data: CSVRow[],
  columns: string[],
  options: CleaningOptions
): CleaningResult {
  let trimmedCells = 0;
  let normalizedCells = 0;
  let normalizedEmails = 0;
  let normalizedPhones = 0;
  let normalizedText = 0;
  let standardizedDates = 0;
  let normalizedHeaders = 0;
  let findReplaceCount = 0;
  let removedEmptyRows = 0;

  let workingData = [...data];

    // ----------------------------------------
  // 0. Normalize column headers
  // ----------------------------------------

  let workingColumns = [...columns];

  if (options.normalizeHeaders) {
    const normalizedColumns = workingColumns.map(
      normalizeHeader
    );

    const headerMap = new Map<string, string>();

    normalizedColumns.forEach((header, index) => {
      const originalHeader = workingColumns[index];

      let finalHeader = header;

      // Prevent duplicate column names.
      if (headerMap.has(finalHeader)) {
        let suffix = 2;

        while (
          headerMap.has(`${header}_${suffix}`)
        ) {
          suffix++;
        }

        finalHeader = `${header}_${suffix}`;
      }
      
      if (finalHeader !== originalHeader) {
        normalizedHeaders++;
      }

      headerMap.set(finalHeader, originalHeader);
      workingColumns[index] = finalHeader;
    });

    workingData = workingData.map((row) => {
      const normalizedRow: CSVRow = {};

      workingColumns.forEach(
        (normalizedHeader, index) => {
          const originalHeader = columns[index];

          normalizedRow[normalizedHeader] =
            row[originalHeader] ?? "";
        }
      );

      return normalizedRow;
    });
  }

  // ----------------------------------------
  // 1. Remove completely empty rows
  // ----------------------------------------

  if (options.removeEmptyRows) {
    const before = workingData.length;

    workingData = workingData.filter((row) => {
      return workingColumns.some(
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

  const duplicateGroups = new Map<
  string,
  {
    columns: string[];
    rowIndexes: number[];
  }
>();

  if (options.removeDuplicates) {
    const seen = new Set<string>();
    const uniqueRows: CSVRow[] = [];

    for (
  let rowIndex = 0;
  rowIndex < workingData.length;
  rowIndex++
) {
  const row = workingData[rowIndex];
      let signature = "";

      // ----------------------------------------
      // Duplicate by email
      // ----------------------------------------

      if (options.duplicateMode === "email") {
        const emailColumn = workingColumns.find((column) =>
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
          signature = workingColumns
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
        const phoneColumn = workingColumns.find(
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
          signature = workingColumns
            .map((column) =>
              String(row[column] ?? "")
                .trim()
                .toLowerCase()
            )
            .join("|");
        }
      }

      // ----------------------------------------
// Duplicate by selected columns
// ----------------------------------------

else if (
  options.duplicateMode === "columns"
) {
  const selectedColumns =
    options.duplicateColumns.filter(
      column => workingColumns.includes(column)
    );

  if (selectedColumns.length > 0) {
    signature = selectedColumns
      .map((column) =>
        String(row[column] ?? "")
          .trim()
          .toLowerCase()
      )
      .join("\u001F");
  } else {
    // No columns selected:
    // safely fall back to the entire row.
    signature = workingColumns
      .map((column) =>
        String(row[column] ?? "")
          .trim()
          .toLowerCase()
      )
      .join("\u001F");
  }
}

// ----------------------------------------
// Duplicate by entire row
// ----------------------------------------

else {
  signature = workingColumns
    .map((column) =>
      String(row[column] ?? "")
        .trim()
        .toLowerCase()
    )
    .join("\u001F");
}

      // ----------------------------------------
      // Check for duplicate
      // ----------------------------------------

      if (signature !== "") {
  const existing =
    duplicateGroups.get(signature);

  if (existing) {
    existing.rowIndexes.push(rowIndex);
  } else {
    duplicateGroups.set(signature, {
      columns:
  options.duplicateMode === "columns"
    ? options.duplicateColumns.filter(
        (column) =>
          workingColumns.includes(column)
      )
    : [...workingColumns],
      rowIndexes: [rowIndex],
    });
  }
}
      
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

  let usefulColumns = [...workingColumns];

  if (options.removeEmptyColumns) {
    usefulColumns = workingColumns.filter((column) => {
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
// Find & Replace
// --------------------------------------

if (
  options.findText !== "" &&
  finalValue !== ""
) {
  const searchText = options.findText;

  if (options.findWholeCell) {
    const matches = options.findCaseSensitive
      ? finalValue === searchText
      : finalValue.toLowerCase() ===
        searchText.toLowerCase();

    if (matches) {
      finalValue = options.replaceText;
      findReplaceCount++;
    }
  } else {
    const originalValue = finalValue;

    if (options.findCaseSensitive) {
      finalValue = finalValue.replaceAll(
        searchText,
        options.replaceText
      );
    } else {
      const escapedSearch = searchText.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      finalValue = finalValue.replace(
        new RegExp(escapedSearch, "gi"),
        options.replaceText
      );
    }

    if (finalValue !== originalValue) {
      findReplaceCount++;
    }
  }
}

            // --------------------------------------
      // Standardize dates
      // --------------------------------------

      if (
        options.standardizeDates &&
        finalValue !== "" &&
        (
          lowerColumn.includes("date") ||
          lowerColumn.includes("dob") ||
          lowerColumn.includes("birth") ||
          lowerColumn.includes("created") ||
          lowerColumn.includes("updated")
        )
      ) {
        const standardized =
          standardizeDate(finalValue);

        if (
          standardized !== null &&
          standardized !== finalValue
        ) {
          standardizedDates++;
          normalizedCells++;
          finalValue = standardized;
        }
      }

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
  normalizedEmails++;
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
  normalizedPhones++;
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
  normalizedText++;
  finalValue = normalized;
}
      }

      cleanedRow[column] = finalValue;
    }

    return cleanedRow;
  });

  const duplicateGroupResults =
  Array.from(
    duplicateGroups.entries()
  )
    .filter(
      ([, group]) =>
        group.rowIndexes.length > 1
    )
    .map(([key, group]) => ({
      key,
      columns: group.columns,
      rowIndexes: group.rowIndexes,
      count: group.rowIndexes.length,
    }));

  return {
  cleanedData,
  removedDuplicates,
  trimmedCells,
  normalizedCells,
  normalizedEmails,
  normalizedPhones,
  normalizedText,
  standardizedDates,
  normalizedHeaders,
  findReplaceCount,
  removedColumns,
  removedEmptyRows,
  duplicateGroups: duplicateGroupResults,
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

export function convertToXLSX(
  data: CSVRow[],
  columns: string[]
): ArrayBuffer {
  const XLSX = require("xlsx");

  const rows = [
    columns,
    ...data.map((row) =>
      columns.map((column) => row[column] ?? "")
    ),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Cleaned Data"
  );

  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });
}