import { CSVRow } from "./analyzer";

export type ColumnType =
  | "email"
  | "phone"
  | "date"
  | "number"
  | "boolean"
  | "id"
  | "text"
  | "empty"
  | "mixed";

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  totalValues: number;
  filledValues: number;
  missingValues: number;
  uniqueValues: number;
  duplicateValues: number;
  fillRate: number;
  confidence: number;
  whitespaceIssues: number;
  invalidValues: number;
}

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PHONE_PATTERN =
  /^[+]?[0-9\s().-]{7,20}$/;

const DATE_PATTERN =
  /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;

const BOOLEAN_VALUES = new Set([
  "true",
  "false",
  "yes",
  "no",
]);

function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

function isPhone(value: string): boolean {
  const cleaned = value.replace(/\s/g, "");

  if (!PHONE_PATTERN.test(value)) {
    return false;
  }

  const digits = cleaned.replace(/\D/g, "");

  return digits.length >= 7 && digits.length <= 15;
}

function isDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const parsed = new Date(value);

  return !Number.isNaN(parsed.getTime());
}

function isNumber(value: string): boolean {
  if (value.trim() === "") {
    return false;
  }

  return /^[-+]?\d*\.?\d+$/.test(
    value.replace(/,/g, "")
  );
}

function isBoolean(value: string): boolean {
  return BOOLEAN_VALUES.has(
    value.toLowerCase()
  );
}

function looksLikeId(
  columnName: string,
  values: string[]
): boolean {
  const name = columnName.toLowerCase();

  const idName =
    name === "id" ||
    name.endsWith("_id") ||
    name.includes("customer id") ||
    name.includes("user id") ||
    name.includes("account id") ||
    name.includes("record id");

  if (idName) {
    return true;
  }

  if (values.length < 2) {
    return false;
  }

  const uniqueCount = new Set(values).size;

  return (
    uniqueCount === values.length &&
    values.every(
      (value) =>
        /^\d+$/.test(value) &&
        value.length >= 4
    )
  );
}

function getColumnType(
  columnName: string,
  values: string[]
): {
  type: ColumnType;
  confidence: number;
} {
  if (values.length === 0) {
    return {
      type: "empty",
      confidence: 100,
    };
  }

  if (looksLikeId(columnName, values)) {
    return {
      type: "id",
      confidence: 95,
    };
  }

  const emailMatches = values.filter(isEmail).length;
  const phoneMatches = values.filter(isPhone).length;
  const dateMatches = values.filter(isDate).length;
  const numberMatches = values.filter(isNumber).length;
  const booleanMatches =
    values.filter(isBoolean).length;

  const total = values.length;

  const candidates: {
    type: ColumnType;
    matches: number;
  }[] = [
    {
      type: "email",
      matches: emailMatches,
    },
    {
      type: "phone",
      matches: phoneMatches,
    },
    {
      type: "date",
      matches: dateMatches,
    },
    {
      type: "number",
      matches: numberMatches,
    },
    {
      type: "boolean",
      matches: booleanMatches,
    },
  ];

  candidates.sort(
    (a, b) => b.matches - a.matches
  );

  const best = candidates[0];

  const confidence =
    (best.matches / total) * 100;

  if (confidence >= 80) {
    return {
      type: best.type,
      confidence: Math.round(confidence),
    };
  }

  if (
    confidence >= 40 &&
    confidence < 80
  ) {
    return {
      type: "mixed",
      confidence: Math.round(confidence),
    };
  }

  return {
    type: "text",
    confidence: 100,
  };
}

export function profileColumns(
  data: CSVRow[],
  columns: string[]
): ColumnProfile[] {
  return columns.map((column) => {
    const allValues = data.map((row) =>
      String(row[column] ?? "")
    );

    const filledValues = allValues.filter(
      (value) => value.trim() !== ""
    );

    const missingValues =
      allValues.length -
      filledValues.length;

    const uniqueValues = new Set(
      filledValues.map((value) =>
        value.trim()
      )
    ).size;

    const duplicateValues =
      filledValues.length -
      uniqueValues;

    const whitespaceIssues =
      allValues.filter(
        (value) =>
          value !== value.trim()
      ).length;

    const {
      type,
      confidence,
    } = getColumnType(
      column,
      filledValues
    );

    let invalidValues = 0;

    if (type === "email") {
      invalidValues =
        filledValues.filter(
          (value) => !isEmail(value.trim())
        ).length;
    }

    if (type === "phone") {
      invalidValues =
        filledValues.filter(
          (value) => !isPhone(value.trim())
        ).length;
    }

    if (type === "date") {
      invalidValues =
        filledValues.filter(
          (value) => !isDate(value.trim())
        ).length;
    }

    return {
      name: column,
      type,
      totalValues: allValues.length,
      filledValues: filledValues.length,
      missingValues,
      uniqueValues,
      duplicateValues,
      fillRate:
        allValues.length === 0
          ? 0
          : Math.round(
              (filledValues.length /
                allValues.length) *
                100
            ),
      confidence,
      whitespaceIssues,
      invalidValues,
    };
  });
}