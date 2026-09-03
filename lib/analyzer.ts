export type CSVRow = Record<string, string>;

export interface AnalysisResult {
  totalRows: number;
  totalColumns: number;
  duplicateRows: number;
  emptyRows: number;
  missingValues: number;
  whitespaceIssues: number;
  invalidEmails: number;
  inconsistentCapitalization: number;
  emptyColumns: string[];

  // Data quality score
  cleanlinessScore: number;
  qualityGrade: string;
  qualityLabel: string;
}

export function analyzeCSV(
  data: CSVRow[],
  columns: string[]
): AnalysisResult {
  let duplicateRows = 0;
  let emptyRows = 0;
  let missingValues = 0;
  let whitespaceIssues = 0;
  let invalidEmails = 0;
  let inconsistentCapitalization = 0;

  const emptyColumns: string[] = [];

  // ----------------------------------------
  // 1. Find duplicate rows
  // ----------------------------------------

  const rowSignatures = new Set<string>();

  for (const row of data) {
    const signature = columns
      .map((column) =>
        String(row[column] ?? "")
          .trim()
          .toLowerCase()
      )
      .join("|");

    if (rowSignatures.has(signature)) {
      duplicateRows++;
    } else {
      rowSignatures.add(signature);
    }
  }

  // ----------------------------------------
  // 2. Analyze every row and cell
  // ----------------------------------------

  for (const row of data) {
    let rowIsEmpty = true;

    for (const column of columns) {
      const rawValue = String(
        row[column] ?? ""
      );

      const trimmedValue =
        rawValue.trim();

      // Missing value
      if (trimmedValue === "") {
        missingValues++;
      } else {
        rowIsEmpty = false;
      }

      // Whitespace problem
      if (
        rawValue !== trimmedValue
      ) {
        whitespaceIssues++;
      }

      // Email validation
      if (
        column
          .toLowerCase()
          .includes("email") &&
        trimmedValue !== ""
      ) {
        const emailPattern =
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
          !emailPattern.test(
            trimmedValue
          )
        ) {
          invalidEmails++;
        }
      }
    }

    if (rowIsEmpty) {
      emptyRows++;
    }
  }

  // ----------------------------------------
  // 3. Find completely empty columns
  // ----------------------------------------

  for (const column of columns) {
    const hasValue = data.some(
      (row) => {
        const value = String(
          row[column] ?? ""
        ).trim();

        return value !== "";
      }
    );

    if (!hasValue) {
      emptyColumns.push(column);
    }
  }

  // ----------------------------------------
  // 4. Detect capitalization inconsistencies
  // ----------------------------------------

  const columnValues: Record<
    string,
    Set<string>
  > = {};

  for (const column of columns) {
    columnValues[column] = new Set();
  }

  for (const row of data) {
    for (const column of columns) {
      const value = String(
        row[column] ?? ""
      ).trim();

      if (value !== "") {
        columnValues[column].add(
          value
        );
      }
    }
  }

  for (const column of columns) {
    const values = Array.from(
      columnValues[column]
    );

    const normalizedGroups =
      new Map<string, string[]>();

    for (const value of values) {
      const normalized =
        value.toLowerCase();

      if (
        !normalizedGroups.has(
          normalized
        )
      ) {
        normalizedGroups.set(
          normalized,
          []
        );
      }

      normalizedGroups
        .get(normalized)!
        .push(value);
    }

    for (const group of normalizedGroups.values()) {
      if (group.length > 1) {
        inconsistentCapitalization++;
      }
    }
  }

  // ----------------------------------------
  // 5. Calculate cleanliness score
  // ----------------------------------------

  const totalCells =
    data.length * columns.length;

  let penalty = 0;

  if (totalCells > 0) {
    // Missing data
    penalty +=
      (missingValues / totalCells) *
      35;

    // Whitespace problems
    penalty +=
      (whitespaceIssues / totalCells) *
      15;
  }

  if (data.length > 0) {
    // Duplicate records
    penalty +=
      (duplicateRows / data.length) *
      20;

    // Empty rows
    penalty +=
      (emptyRows / data.length) *
      10;

    // Invalid emails
    penalty +=
      (invalidEmails / data.length) *
      10;
  }

  if (columns.length > 0) {
    // Empty columns
    penalty +=
      (emptyColumns.length /
        columns.length) *
      5;
  }

  // Capitalization gets a smaller penalty
  if (data.length > 0) {
    penalty +=
      Math.min(
        inconsistentCapitalization /
          data.length,
        1
      ) * 5;
  }

  const cleanlinessScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(100 - penalty)
    )
  );

  // ----------------------------------------
  // 6. Convert score into grade
  // ----------------------------------------

  let qualityGrade = "F";
  let qualityLabel = "Needs major cleanup";

  if (cleanlinessScore >= 90) {
    qualityGrade = "A";
    qualityLabel = "Excellent data";
  } else if (cleanlinessScore >= 80) {
    qualityGrade = "B";
    qualityLabel = "Good data";
  } else if (cleanlinessScore >= 70) {
    qualityGrade = "C";
    qualityLabel = "Fair data";
  } else if (cleanlinessScore >= 60) {
    qualityGrade = "D";
    qualityLabel = "Needs cleanup";
  }

  return {
    totalRows: data.length,
    totalColumns: columns.length,
    duplicateRows,
    emptyRows,
    missingValues,
    whitespaceIssues,
    invalidEmails,
    inconsistentCapitalization,
    emptyColumns,
    cleanlinessScore,
    qualityGrade,
    qualityLabel,
  };
}