export type CSVRow = Record<string, string>;

export type IssueSeverity =
  | "safe"
  | "review"
  | "attention";

export type ValidationRuleType =
  | "email"
  | "number"
  | "range"
  | "allowed-values";

export interface ValidationRule {
  column: string;
  type: ValidationRuleType;
  min?: number;
  max?: number;
  allowedValues?: string[];
}

export interface ValidationResult {
  rule: ValidationRule;
  invalidCount: number;
  invalidValues: string[];
}

function validateColumnRule(
  data: CSVRow[],
  rule: ValidationRule
): ValidationResult {
  const invalidValues: string[] = [];

  for (const row of data) {
    const value = String(row[rule.column] ?? "").trim();

    if (value === "") {
      continue;
    }

    let isValid = true;

    switch (rule.type) {
      case "email":
        isValid = isEmail(value);
        break;

      case "number":
        isValid = isNumber(value);
        break;

      case "range": {
        const cleaned = value
          .replace(/[$€£₦¥₹₽₩₫₱฿₡₲₴₭₮₺₼₾₿]/g, "")
          .replace(
            /\b(USD|EUR|GBP|NGN|JPY|CNY|INR|CAD|AUD|ZAR)\b/gi,
            ""
          )
          .replace(/,/g, "")
          .replace(/%/g, "")
          .trim();

        const number = Number(cleaned);

        if (!Number.isFinite(number)) {
          isValid = false;
          break;
        }

        if (
          rule.min !== undefined &&
          number < rule.min
        ) {
          isValid = false;
        }

        if (
          rule.max !== undefined &&
          number > rule.max
        ) {
          isValid = false;
        }

        break;
      }

      case "allowed-values":
        isValid =
          rule.allowedValues?.some(
            (allowedValue) =>
              allowedValue.trim().toLowerCase() ===
              value.toLowerCase()
          ) ?? false;
        break;
    }

    if (!isValid) {
      invalidValues.push(value);
    }
  }

  return {
    rule,
    invalidCount: invalidValues.length,
    invalidValues,
  };
}

export interface DataQualityIssue {
  type: string;
  label: string;
  count: number;
  severity: IssueSeverity;
  description: string;
}

export interface ColumnDiagnostic {
  name: string;
  detectedType:
    | "Text"
    | "Email"
    | "Phone"
    | "Number"
    | "Currency"
    | "Percentage"
    | "Date"
    | "Empty"
    | "Mixed";

  totalValues: number;
  filledValues: number;
  emptyValues: number;
  missingLikeCount: number;

  completeness: number;
  uniqueness: number;
  uniqueValues: number;

  whitespaceIssues: number;
  capitalizationIssues: number;
  invalidValues: number;

  outlierCount: number;
  outlierValues: string[];

  categoryInconsistencyCount: number;
  categoryInconsistencyGroups: string[][];

  minLength: number;
  maxLength: number;

  sampleValues: string[];
}

export interface AnalysisResult {
  totalRows: number;
  totalColumns: number;
  duplicateRows: number;
  emptyRows: number;
  missingValues: number;
  missingLikeValues: number;
  whitespaceIssues: number;
  invalidEmails: number;
  inconsistentCapitalization: number;
  emptyColumns: string[];

  cleanlinessScore: number;
  qualityGrade: string;
  qualityLabel: string;

  issues: DataQualityIssue[];

  columnDiagnostics: ColumnDiagnostic[];
  validationResults: ValidationResult[];
}

function isMissingLikeValue(value: string): boolean {
  const normalized = value
    .trim()
    .toLowerCase();

  if (normalized === "") {
    return true;
  }

  const missingValues = new Set([
    "n/a",
    "na",
    "null",
    "none",
    "nil",
    "nan",
    "unknown",
    "not available",
    "not applicable",
    "not provided",
    "not available",
    "-",
    "—",
    "(blank)",
  ]);

  return missingValues.has(normalized);
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");

  return (
    digits.length >= 10 &&
    digits.length <= 15
  );
}

function isNumber(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  // Remove common currency symbols, percentage signs,
  // spaces, and thousands separators.
  const cleaned = trimmed
    .replace(
      /[$€£₦¥₹₽₩₫₴₺₱฿₡₲₵₭₮₼₾%]/g,
      ""
    )
    .replace(/\s/g, "")
    .replace(/,/g, "")
    .trim();

  // Support negative values.
  if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) {
    return false;
  }

  return Number.isFinite(Number(cleaned));
}

function isCurrency(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  const hasCurrencySymbol =
    /[$€£₦¥₹₽₩₫₴₺₱฿₡₲₵₭₮₼₾]/.test(
      trimmed
    );

  const hasCurrencyCode =
    /(?:^|\s)(USD|EUR|GBP|NGN|JPY|CNY|INR|CAD|AUD|ZAR)(?:\s|$)/i.test(
      trimmed
    );

  if (
    !hasCurrencySymbol &&
    !hasCurrencyCode
  ) {
    return false;
  }

  const numericPart = trimmed
    .replace(
      /[$€£₦¥₹₽₩₫₴₺₱฿₡₲₵₭₮₼₾]/g,
      ""
    )
    .replace(
      /\b(USD|EUR|GBP|NGN|JPY|CNY|INR|CAD|AUD|ZAR)\b/gi,
      ""
    )
    .replace(/\s/g, "")
    .replace(/,/g, "")
    .trim();

  return /^-?\d+(?:\.\d+)?$/.test(
    numericPart
  );
}

function isPercentage(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed.endsWith("%")) {
    return false;
  }

  const numericPart = trimmed
    .slice(0, -1)
    .replace(/\s/g, "")
    .replace(/,/g, "")
    .trim();

  return /^-?\d+(?:\.\d+)?$/.test(
    numericPart
  );
}

function getMedian(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort(
    (a, b) => a - b
  );

  const middle = Math.floor(
    sorted.length / 2
  );

  if (sorted.length % 2 === 0) {
    return (
      (sorted[middle - 1] + sorted[middle]) / 2
    );
  }

  return sorted[middle];
}

function detectOutliers(
  values: string[]
): {
  count: number;
  values: string[];
} {
  if (values.length < 5) {
    return {
      count: 0,
      values: [],
    };
  }

  const numericValues = values
    .map((value) => {
      const cleaned = value
        .replace(
          /[$â‚¬Â£â‚¦Â¥â‚¹â‚½â‚©â‚«â‚´â‚ºâ‚±à¸¿â‚¡â‚²â‚µâ‚â‚®â‚¼â‚¾]/g,
          ""
        )
        .replace(
          /\b(USD|EUR|GBP|NGN|JPY|CNY|INR|CAD|AUD|ZAR)\b/gi,
          ""
        )
        .replace(/%/g, "")
        .replace(/\s/g, "")
        .replace(/,/g, "")
        .trim();

      const number = Number(cleaned);

      return Number.isFinite(number)
        ? {
            original: value,
            number,
          }
        : null;
    })
    .filter(
      (
        item
      ): item is {
        original: string;
        number: number;
      } => item !== null
    );

  if (numericValues.length < 5) {
    return {
      count: 0,
      values: [],
    };
  }

  const numbers = numericValues.map(
    (item) => item.number
  );

  const median = getMedian(numbers);

  const deviations = numbers.map(
    (number) => Math.abs(number - median)
  );

  const mad = getMedian(deviations);

  if (mad === 0) {
    return {
      count: 0,
      values: [],
    };
  }

  const threshold = 3.5;

  const outliers = numericValues.filter(
    (item) => {
      const modifiedZScore =
        (0.6745 *
          Math.abs(item.number - median)) /
        mad;

      return modifiedZScore > threshold;
    }
  );

  return {
    count: outliers.length,
    values: outliers.map(
      (item) => item.original
    ),
  };
}

function isDate(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed) return false;

  // ISO: 2026-09-03
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      trimmed
    )
  ) {
    const [year, month, day] =
      trimmed.split("-").map(Number);

    const date = new Date(
      Date.UTC(year, month - 1, day)
    );

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }

  // Slash or dash formats:
  // 03/09/2026
  // 03-09-2026
  const numericMatch = trimmed.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
  );

  if (numericMatch) {
    const first = Number(numericMatch[1]);
    const second = Number(numericMatch[2]);
    const year = Number(numericMatch[3]);

    // Reject impossible dates.
    if (
      first < 1 ||
      first > 31 ||
      second < 1 ||
      second > 31
    ) {
      return false;
    }

    // Ambiguous numeric dates are accepted as
    // potentially valid dates for detection.
    return (
      (first <= 12 && second <= 31) ||
      (first <= 31 && second <= 12)
    );
  }

  // Month-name formats such as:
  // March 4, 2026
  // 4 March 2026
  const monthNameMatch =
    /^[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}$|^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}$/;

  if (monthNameMatch.test(trimmed)) {
    const timestamp = Date.parse(trimmed);

    return !Number.isNaN(timestamp);
  }

  return false;
}

function detectCategoryInconsistencies(
  values: string[]
): {
  count: number;
  groups: string[][];
} {
  const groups = new Map<
    string,
    string[]
  >();

  for (const value of values) {
    const trimmed = value.trim();

    if (!trimmed) {
      continue;
    }

    const normalized = trimmed
      .toLowerCase()
      .replace(/\s+/g, " ");

    if (!groups.has(normalized)) {
      groups.set(normalized, []);
    }

    const group = groups.get(normalized)!;

    if (!group.includes(trimmed)) {
      group.push(trimmed);
    }
  }

  const inconsistentGroups =
    Array.from(groups.values()).filter(
      (group) => group.length > 1
    );

  const count =
    inconsistentGroups.reduce(
      (total, group) =>
        total + group.length - 1,
      0
    );

  return {
    count,
    groups: inconsistentGroups,
  };
}

function detectColumnType(
  column: string,
  values: string[]
): ColumnDiagnostic["detectedType"] {
  if (values.length === 0) {
    return "Empty";
  }

  const lowerColumn = column.toLowerCase();

  const emailMatches = values.filter(isEmail).length;
  const phoneMatches = values.filter(isPhone).length;
  const currencyMatches = values.filter(isCurrency).length;
  const percentageMatches =
    values.filter(isPercentage).length;
  const numberMatches = values.filter(isNumber).length;
  const dateMatches = values.filter(isDate).length;

  const total = values.length;

  // Column-name hints take priority when strongly supported.
  if (
    lowerColumn.includes("email") &&
    emailMatches / total >= 0.6
  ) {
    return "Email";
  }

  if (
    (lowerColumn.includes("phone") ||
      lowerColumn.includes("mobile") ||
      lowerColumn.includes("telephone")) &&
    phoneMatches / total >= 0.6
  ) {
    return "Phone";
  }

  if (
  dateMatches / total >= 0.8 &&
  values.length >= 2
) {
  return "Date";
}

if (
  currencyMatches / total >= 0.8
) {
  return "Currency";
}

if (
  percentageMatches / total >= 0.8
) {
  return "Percentage";
}

if (numberMatches / total >= 0.8) {
  return "Number";
}

  if (emailMatches / total >= 0.8) {
    return "Email";
  }

  if (phoneMatches / total >= 0.8) {
    return "Phone";
  }

  const textMatches = values.filter(
    (value) =>
      !isNumber(value) &&
      !isDate(value) &&
      !isEmail(value)
  ).length;

  if (textMatches / total >= 0.8) {
    return "Text";
  }

  return "Mixed";
}

function buildColumnDiagnostic(
  data: CSVRow[],
  column: string
): ColumnDiagnostic {
  const rawValues = data.map(
  (row) => row[column] ?? ""
);

const values = rawValues.filter(
  (value) => !isMissingLikeValue(value)
);

const missingLikeValues = rawValues.filter(
  (value) =>
    isMissingLikeValue(value) &&
    value.trim() !== ""
);

  const totalValues = rawValues.length;

  const filledValues = values.length;

  const emptyValues =
    totalValues - filledValues;

  const missingLikeCount =
    missingLikeValues.length;

  const uniqueSet = new Set(
    values.map((value) => value.toLowerCase())
  );

  const uniqueValues = uniqueSet.size;

  const completeness =
    totalValues === 0
      ? 100
      : Math.round(
          (filledValues / totalValues) * 100
        );

  const uniqueness =
    filledValues === 0
      ? 0
      : Math.round(
          (uniqueValues / filledValues) * 100
        );

  let whitespaceIssues = 0;

  let capitalizationIssues = 0;

  let invalidValues = 0;

  for (const rawValue of rawValues) {
    const trimmedValue = rawValue.trim();

    if (rawValue !== trimmedValue) {
      whitespaceIssues++;
    }
  }

  const capitalizationGroups =
    new Map<string, Set<string>>();

  for (const value of values) {
    const normalized = value.toLowerCase();

    if (!capitalizationGroups.has(normalized)) {
      capitalizationGroups.set(
        normalized,
        new Set()
      );
    }

    capitalizationGroups
      .get(normalized)!
      .add(value);
  }

  for (const group of capitalizationGroups.values()) {
    if (group.size > 1) {
      capitalizationIssues += group.size - 1;
    }
  }

  const outlierResult =
    detectOutliers(values);

  const categoryConsistency =
    detectCategoryInconsistencies(values);  

  const detectedType = detectColumnType(
    column,
    values
  );

  if (detectedType === "Email") {
    invalidValues = values.filter(
      (value) => !isEmail(value)
    ).length;
  }

  if (detectedType === "Phone") {
    invalidValues = values.filter(
      (value) => !isPhone(value)
    ).length;
  }

    if (detectedType === "Number") {
    invalidValues = values.filter(
      (value) => !isNumber(value)
    ).length;
  }

  if (detectedType === "Currency") {
    invalidValues = values.filter(
      (value) => !isCurrency(value)
    ).length;
  }

  if (detectedType === "Percentage") {
    invalidValues = values.filter(
      (value) => !isPercentage(value)
    ).length;
  }

  if (detectedType === "Date") {
    invalidValues = values.filter(
      (value) => !isDate(value)
    ).length;
  }

  const lengths = values.map(
    (value) => value.length
  );

  const minLength =
    lengths.length > 0
      ? Math.min(...lengths)
      : 0;

  const maxLength =
    lengths.length > 0
      ? Math.max(...lengths)
      : 0;

  const sampleValues = Array.from(
    new Set(values)
  ).slice(0, 5);

  return {
    name: column,
    detectedType,

    totalValues,
    filledValues,
    emptyValues,
    missingLikeCount,

    completeness,
    uniqueness,
    uniqueValues,

    whitespaceIssues,
    capitalizationIssues,
    invalidValues,

    outlierCount: outlierResult.count,
    outlierValues: outlierResult.values,

    categoryInconsistencyCount:
      categoryConsistency.count,
    categoryInconsistencyGroups:
      categoryConsistency.groups,

    minLength,
    maxLength,

    sampleValues,
  };
}

export function analyzeCSV(
  data: CSVRow[],
  columns: string[],
  validationRules: ValidationRule[] = []
): AnalysisResult {
  let duplicateRows = 0;
  let emptyRows = 0;
  let missingValues = 0;
  let missingLikeValues = 0;
  let whitespaceIssues = 0;
  let invalidEmails = 0;
  let inconsistentCapitalization = 0;

  const emptyColumns: string[] = [];

  const issues: DataQualityIssue[] = [];

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

      if (trimmedValue === "") {
  missingValues++;
} else {
  rowIsEmpty = false;

  if (isMissingLikeValue(rawValue)) {
    missingLikeValues++;
  }
}

      if (
        rawValue !== trimmedValue
      ) {
        whitespaceIssues++;
      }

      if (
        column
          .toLowerCase()
          .includes("email") &&
        trimmedValue !== ""
      ) {
        if (!isEmail(trimmedValue)) {
          invalidEmails++;
        }
      }
    }

    if (rowIsEmpty) {
      emptyRows++;
    }
  }

  // ----------------------------------------
  // 3. Find empty columns
  // ----------------------------------------

  for (const column of columns) {
    const hasValue = data.some(
      (row) =>
        String(row[column] ?? "").trim() !== ""
    );

    if (!hasValue) {
      emptyColumns.push(column);
    }
  }

  // ----------------------------------------
  // 4. Detect capitalization issues
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
        columnValues[column].add(value);
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
        !normalizedGroups.has(normalized)
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
  // 5. Column-level diagnostics
  // ----------------------------------------

  const columnDiagnostics =
    columns.map((column) =>
      buildColumnDiagnostic(
        data,
        column
      )
    );

  // ----------------------------------------
  // 6. Calculate cleanliness score
  // ----------------------------------------

  const totalCells =
    data.length * columns.length;

  let penalty = 0;

  if (totalCells > 0) {
    penalty +=
      (missingValues / totalCells) * 35;

    penalty +=
      (whitespaceIssues / totalCells) * 15;
  }

  if (data.length > 0) {
    penalty +=
      (duplicateRows / data.length) * 20;

    penalty +=
      (emptyRows / data.length) * 10;

    penalty +=
      (invalidEmails / data.length) * 10;
  }

  if (columns.length > 0) {
    penalty +=
      (emptyColumns.length /
        columns.length) *
      5;
  }

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

  const qualityGrade =
    cleanlinessScore >= 90
      ? "A"
      : cleanlinessScore >= 75
        ? "B"
        : cleanlinessScore >= 60
          ? "C"
          : cleanlinessScore >= 40
            ? "D"
            : "F";

  const qualityLabel =
    cleanlinessScore >= 90
      ? "Excellent"
      : cleanlinessScore >= 75
        ? "Good"
        : cleanlinessScore >= 60
          ? "Fair"
          : cleanlinessScore >= 40
            ? "Needs attention"
            : "Poor";

  // ----------------------------------------
  // 7. Categorize detected issues
  // ----------------------------------------

    const invalidValueIssues =
    columnDiagnostics.filter(
      (diagnostic) =>
        diagnostic.invalidValues > 0
    );

  const totalInvalidValues =
    invalidValueIssues.reduce(
      (total, diagnostic) =>
        total + diagnostic.invalidValues,
      0
    );

  if (totalInvalidValues > 0) {
    issues.push({
      type: "invalid-values",
      label: "Invalid values",
      count: totalInvalidValues,
      severity: "review",
      description:
        "Some values do not match the detected format or data type of their column.",
    });
  }
  
    const outlierColumns =
    columnDiagnostics.filter(
      (diagnostic) =>
        diagnostic.outlierCount > 0
    );

  const totalOutliers =
    outlierColumns.reduce(
      (total, diagnostic) =>
        total + diagnostic.outlierCount,
      0
    );

  if (totalOutliers > 0) {
    issues.push({
      type: "outliers",
      label: "Potential outliers",
      count: totalOutliers,
      severity: "review",
      description:
        "Some numeric values are unusually far from the typical values in their columns and should be reviewed.",
    });
  }
  
  const categoryInconsistencyColumns =
  columnDiagnostics.filter(
    (diagnostic) =>
      diagnostic.categoryInconsistencyCount > 0
  );

const totalCategoryInconsistencies =
  categoryInconsistencyColumns.reduce(
    (total, diagnostic) =>
      total + diagnostic.categoryInconsistencyCount,
    0
  );

if (totalCategoryInconsistencies > 0) {
  issues.push({
    type: "category-inconsistency",
    label: "Category inconsistencies",
    count: totalCategoryInconsistencies,
    severity: "review",
    description:
      "Some categorical values appear in multiple formatting variants and should be reviewed for consistency.",
  });
}

  if (whitespaceIssues > 0) {
    issues.push({
      type: "whitespace",
      label: "Extra whitespace",
      count: whitespaceIssues,
      severity: "safe",
      description:
        "Values contain unnecessary spaces that can be safely trimmed.",
    });
  }

  if (inconsistentCapitalization > 0) {
    issues.push({
      type: "capitalization",
      label: "Inconsistent capitalization",
      count: inconsistentCapitalization,
      severity: "safe",
      description:
        "Similar text values use different capitalization.",
    });
  }

  if (duplicateRows > 0) {
    issues.push({
      type: "duplicates",
      label: "Duplicate rows",
      count: duplicateRows,
      severity: "safe",
      description:
        "Rows appear to contain identical data.",
    });
  }

  if (emptyRows > 0) {
    issues.push({
      type: "empty-rows",
      label: "Empty rows",
      count: emptyRows,
      severity: "safe",
      description:
        "Rows contain no usable data.",
    });
  }

  if (emptyColumns.length > 0) {
    issues.push({
      type: "empty-columns",
      label: "Empty columns",
      count: emptyColumns.length,
      severity: "safe",
      description:
        "Columns contain no usable values.",
    });
  }

  if (invalidEmails > 0) {
    issues.push({
      type: "invalid-emails",
      label: "Invalid email addresses",
      count: invalidEmails,
      severity: "review",
      description:
        "These values do not match a recognizable email format.",
    });
  }

  const totalMissingValues =
  missingValues + missingLikeValues;

if (totalMissingValues > 0) {
  issues.push({
    type: "missing-values",
    label: "Missing values",
    count: totalMissingValues,
    severity: "review",
    description:
      missingLikeValues > 0
        ? "Some cells are empty or contain common missing-value placeholders such as N/A, NULL, or Unknown."
        : "Some cells are missing values.",
  });
}

const validationResults =
  validationRules.map((rule) =>
    validateColumnRule(data, rule)
  );

const validationIssues =
  validationResults.filter(
    (result) =>
      result.invalidCount > 0
  );

const totalValidationErrors =
  validationIssues.reduce(
    (total, result) =>
      total + result.invalidCount,
    0
  );

if (totalValidationErrors > 0) {
  issues.push({
    type: "validation-rules",
    label: "Validation rule failures",
    count: totalValidationErrors,
    severity: "review",
    description:
      "Some values do not satisfy the validation rules defined for their columns.",
  });
}

  return {
    totalRows: data.length,
    totalColumns: columns.length,
    duplicateRows,
    emptyRows,
    missingValues,
    missingLikeValues,
    whitespaceIssues,
    invalidEmails,
    inconsistentCapitalization,
    emptyColumns,
    cleanlinessScore,
    qualityGrade,
    qualityLabel,
    issues,
    columnDiagnostics,
    validationResults,
  };
}