"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";
import FileUploader from "@/components/FileUploader";
import ThemeToggle from "@/components/ThemeToggle";
import {
  analyzeCSV,
  AnalysisResult,
  CSVRow,
  ValidationRule,
} from "@/lib/analyzer";
import {
  cleanCSV,
  CleaningOptions,
  CleaningResult,
  convertToCSV,
  convertToXLSX,
} from "@/lib/cleaner";
import {
  profileColumns,
  ColumnProfile,
} from "@/lib/columnDetector";

const defaultOptions: CleaningOptions = {
  removeDuplicates: true,
  trimWhitespace: true,
  normalizeCapitalization: true,
  lowercaseEmails: true,
  normalizePhones: true,
  standardizeDates: true,
  normalizeHeaders: false,
  findText: "",
  replaceText: "",
  findCaseSensitive: false,
  findWholeCell: false,
  removeEmptyColumns: true,
  removeEmptyRows: false,
  duplicateMode: "row",
  duplicateColumns: [],
  columnsToRemove: [],
};

export default function Home() {
  const [analysis, setAnalysis] =
    useState<AnalysisResult | null>(null);
  
  const [cleanedAnalysis, setCleanedAnalysis] =
  useState<AnalysisResult | null>(null);

  const [fileName, setFileName] = useState("");

  const [data, setData] = useState<CSVRow[]>([]);

  const [columns, setColumns] = useState<string[]>([]);

  const [columnProfiles, setColumnProfiles] =
  useState<ColumnProfile[]>([]);

  const [cleaningResult, setCleaningResult] =
    useState<CleaningResult | null>(null);

  const [options, setOptions] =
    useState<CleaningOptions>(defaultOptions);

  const [showControls, setShowControls] = useState(true);

  const [validationRules, setValidationRules] =
    useState<ValidationRule[]>([]);

  const [ruleColumn, setRuleColumn] = useState("");
  const [ruleType, setRuleType] =
    useState<ValidationRule["type"]>("email");
  const [ruleMin, setRuleMin] = useState("");
  const [ruleMax, setRuleMax] = useState("");
  const [ruleAllowedValues, setRuleAllowedValues] =
    useState("");

  const handleFileLoaded = (
    uploadedData: CSVRow[],
    uploadedFileName: string
  ) => {
    track("file_uploaded", {
  file_type: uploadedFileName.split(".").pop() || "unknown",
});

    const detectedColumns =
      uploadedData.length > 0
        ? Object.keys(uploadedData[0])
        : [];

    const result = analyzeCSV(
  uploadedData,
  detectedColumns,
  validationRules
);

    const profiles = profileColumns(
  uploadedData,
  detectedColumns
);

    setData(uploadedData);
    setColumns(detectedColumns);
    setColumnProfiles(profiles);
    setFileName(uploadedFileName);
    setAnalysis(result);
    track("analysis_completed", { source: "upload" });
    setCleaningResult(null);
    setCleanedAnalysis(null);
    setOptions(defaultOptions);
    setShowControls(true);
  };

  const loadSampleCSV = () => {
    track("sample_csv_used");
    const sampleData: CSVRow[] = [
      {
        Name: " John Smith ",
        Email: "JOHN.SMITH@EXAMPLE.COM",
        Phone: "(080) 123-4567",
        City: "lagos",
      },
      {
        Name: "Mary Johnson",
        Email: "mary.johnson@example.com",
        Phone: "080 234 5678",
        City: "Abuja",
      },
      {
        Name: "John Smith",
        Email: "JOHN.SMITH@EXAMPLE.COM",
        Phone: "0801234567",
        City: "LAGOS",
      },
      {
        Name: " david williams ",
        Email: "david.williams@example.com",
        Phone: "080-345-6789",
        City: "ibadan",
      },
      {
        Name: "Sarah Brown",
        Email: "sarah.brown@example",
        Phone: "080 456 7890",
        City: "Port Harcourt",
      },
      {
        Name: "Michael Davis",
        Email: " michael.davis@example.com ",
        Phone: "(080) 567-8901",
        City: "kano",
      },
    ];

    const detectedColumns = Object.keys(sampleData[0]);

    const result = analyzeCSV(
      sampleData,
      detectedColumns
    );
    
    const profiles = profileColumns(
  sampleData,
  detectedColumns
);

    setData(sampleData);
    setColumns(detectedColumns);
    setColumnProfiles(profiles);
    setFileName("cleanflow-sample.csv");
    setAnalysis(result);
    track("analysis_completed", { source: "sample" });
    setCleaningResult(null);
    setOptions(defaultOptions);
    setShowControls(true);

        setTimeout(() => {
      document
        .getElementById("analysis")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  };

  const updateOption = <
    K extends keyof CleaningOptions
  >(
    key: K,
    value: CleaningOptions[K]
  ) => {
    setOptions((current) => ({
      ...current,
      [key]: value,
    }));

    setCleaningResult(null);
  };

  const addValidationRule = () => {
  if (!ruleColumn) {
    return;
  }

  const rule: ValidationRule = {
    column: ruleColumn,
    type: ruleType,
  };

  if (ruleType === "range") {
    const min = Number(ruleMin);
    const max = Number(ruleMax);

    if (
      ruleMin === "" ||
      ruleMax === "" ||
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      min > max
    ) {
      return;
    }

    rule.min = min;
    rule.max = max;
  }

  if (ruleType === "allowed-values") {
    const allowedValues = ruleAllowedValues
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (allowedValues.length === 0) {
      return;
    }

    rule.allowedValues = allowedValues;
  }

  setValidationRules((current) => [
    ...current,
    rule,
  ]);

  setRuleMin("");
  setRuleMax("");
  setRuleAllowedValues("");
};

  const runCleaning = () => {
    if (!analysis || data.length === 0) {
      return;
    }

    const result = cleanCSV(
  data,
  columns,
  options
);

const cleanedColumns =
  result.cleanedData.length > 0
    ? Object.keys(result.cleanedData[0])
    : columns;

const afterAnalysis = analyzeCSV(
  result.cleanedData,
  cleanedColumns
);

setCleaningResult(result);
track("cleaning_completed", { duplicate_mode: options.duplicateMode });
    setShowControls(false);

    setTimeout(() => {
      document
        .getElementById("results")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  };

  const downloadCleanedCSV = () => {
    if (
      !cleaningResult ||
      cleaningResult.cleanedData.length === 0
    ) {
      return;
    }

    const cleanedColumns = Object.keys(
      cleaningResult.cleanedData[0]
    );

    const csv = convertToCSV(
      cleaningResult.cleanedData,
      cleanedColumns
    );

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    const originalName = fileName.replace(
      /\.csv$/i,
      ""
    );

    link.download = `${originalName}-cleaned.csv`;

    track("csv_downloaded");


    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const downloadCleanedXLSX = () => {
  if (
    !cleaningResult ||
    cleaningResult.cleanedData.length === 0
  ) {
    return;
  }

  const cleanedColumns = Object.keys(
    cleaningResult.cleanedData[0]
  );

  const xlsxData = convertToXLSX(
    cleaningResult.cleanedData,
    cleanedColumns
  );

  const blob = new Blob([xlsxData], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  const originalName = fileName.replace(
    /\.(csv|xlsx)$/i,
    ""
  );

  link.download = `${originalName}-cleaned.xlsx`;

    track("xlsx_downloaded");


  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

  const resetApp = () => {
    setAnalysis(null);
    setFileName("");
    setData([]);
    setColumns([]);
    setColumnProfiles([]);
    setCleaningResult(null);
    setCleanedAnalysis(null);
    setOptions(defaultOptions);
    setShowControls(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };
  
  const qualityImprovement =
  analysis && cleanedAnalysis
    ? cleanedAnalysis.cleanlinessScore -
      analysis.cleanlinessScore
    : 0;

  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
      {/* ================================
          NAVIGATION
      ================================= */}

      <nav className="border-b border-slate-200 dark:border-slate-800/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <button
            onClick={resetApp}
            className="flex items-center"
          >
            <img
              src="/cleanflow-logo.png"
              alt="CleanFlow"
              className="h-12 w-auto object-contain"
            />
          </button>

          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() =>
                document
                  .getElementById("how-it-works")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
            >
              How it works
            </button>

            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* ================================
          HERO
      ================================= */}

      {!analysis && (
        <section className="mx-auto max-w-5xl px-6 pb-20 pt-20 text-center">
          <div className="mx-auto mb-6 inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
            Smart spreadsheet cleaning
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl">
            Clean your spreadsheet
            <span className="block text-blue-500">
              without the headache.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-400">
            Detect duplicates, missing values,
            formatting problems and other common
            spreadsheet issues in seconds.
          </p>

          <div className="mx-auto max-w-2xl">
  <FileUploader
    onFileLoaded={handleFileLoaded}
  />

  <div className="mt-4 flex items-center justify-center">
    <button
      onClick={loadSampleCSV}
      className="rounded-xl border border-slate-300 bg-slate-100 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-blue-500/50 hover:bg-slate-200 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
    >
      Try a sample CSV
    </button>
  </div>

  <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-500">
  <span>? Runs in your browser</span>
  <span>? No account required</span>
  <span>? Your files stay private</span>
</div>
</div>
        </section>
      )}

      {/* ================================
          ANALYSIS DASHBOARD
      ================================= */}

      {analysis && (
        <section
          id="analysis"
          className="mx-auto max-w-6xl px-6 pb-24 pt-12">
          {/* FILE HEADER */}

          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Analyzed file
              </p>

              <h2 className="mt-1 break-all text-2xl font-bold">
                {fileName}
              </h2>

              <p className="mt-1 text-sm text-slate-600 dark:text-slate-500">
                {analysis.totalRows.toLocaleString()}{" "}
                rows · {analysis.totalColumns} columns
              </p>
            </div>

            <button
              onClick={resetApp}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
            >
              Upload another file
            </button>
          </div>

          {/* ================================
              SCORE + REPORT
          ================================= */}

          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            {/* SCORE CARD */}

            <div className="rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">
                Data quality
              </p>

              <div className="mt-8 flex flex-col items-center">
                <ScoreCircle
                  score={
                    analysis.cleanlinessScore
                  }
                />

                <h2 className="mt-6 text-2xl font-bold">
                  Grade {analysis.qualityGrade}
                </h2>

                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  {analysis.qualityLabel}
                </p>
              </div>

              <div className="mt-8">
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-slate-500">
                    Quality score
                  </span>

                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {analysis.cleanlinessScore}%
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      analysis.cleanlinessScore >=
                      90
                        ? "bg-emerald-500"
                        : analysis.cleanlinessScore >=
                          80
                        ? "bg-blue-500"
                        : analysis.cleanlinessScore >=
                          70
                        ? "bg-yellow-500"
                        : analysis.cleanlinessScore >=
                          60
                        ? "bg-orange-500"
                        : "bg-red-500"
                    }`}
                    style={{
                      width: `${analysis.cleanlinessScore}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* ISSUE REPORT */}

            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">
                Quality report
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Issues found
              </h2>

              <p className="mt-2 text-sm text-slate-600 dark:text-slate-500">
                CleanFlow checked your spreadsheet
                for common data-quality problems.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <IssueCard
                  icon="↔"
                  title="Duplicate rows"
                  value={
                    analysis.duplicateRows
                  }
                  description="Repeated records detected"
                />

                <IssueCard
                  icon="!"
                  title="Missing values"
                  value={
                    analysis.missingValues
                  }
                  description="Empty cells detected"
                />

                <IssueCard
                  icon="T"
                  title="Whitespace"
                  value={
                    analysis.whitespaceIssues
                  }
                  description="Extra spaces detected"
                />

                <IssueCard
                  icon="@"
                  title="Invalid emails"
                  value={
                    analysis.invalidEmails
                  }
                  description="Email values need attention"
                />

                <IssueCard
                  icon="A"
                  title="Capitalization"
                  value={
                    analysis.inconsistentCapitalization
                  }
                  description="Inconsistent text formatting"
                />

                <IssueCard
                  icon="□"
                  title="Empty rows"
                  value={analysis.emptyRows}
                  description="Completely empty records"
                />
              </div>
            </div>
          </div>

          {/* ================================
              CLEANING CONTROLS
          ================================= */}

          <div
            id="cleaning-controls"
            className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          >
            <button
              onClick={() =>
                setShowControls(
                  !showControls
                )
              }
              className="flex w-full items-center justify-between px-6 py-6 text-left"
            >
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">
                  Step 2
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  Choose what to clean
                </h2>

                <p className="mt-1 text-sm text-slate-600 dark:text-slate-500">
                  You stay in control of every change.
                </p>
              </div>

              <span className="text-2xl text-slate-500">
                {showControls ? "−" : "+"}
              </span>
            </button>

            {showControls && (
              <div className="border-t border-slate-200 px-6 py-6 dark:border-slate-800">
                <div className="grid gap-4 md:grid-cols-2">
                  <CleaningCheckbox
                    checked={
                      options.removeDuplicates
                    }
                    onChange={(value) =>
                      updateOption(
                        "removeDuplicates",
                        value
                      )
                    }
                    title="Remove duplicate rows"
                    description="Keep only the first copy of duplicate records."
                  />

                  <CleaningCheckbox
                    checked={
                      options.trimWhitespace
                    }
                    onChange={(value) =>
                      updateOption(
                        "trimWhitespace",
                        value
                      )
                    }
                    title="Trim extra spaces"
                    description="Remove spaces before and after values."
                  />

                  <CleaningCheckbox
                    checked={
                      options.normalizeCapitalization
                    }
                    onChange={(value) =>
                      updateOption(
                        "normalizeCapitalization",
                        value
                      )
                    }
                    title="Normalize capitalization"
                    description="Make ordinary text formatting consistent."
                  />

                  <CleaningCheckbox
                    checked={
                      options.lowercaseEmails
                    }
                    onChange={(value) =>
                      updateOption(
                        "lowercaseEmails",
                        value
                      )
                    }
                    title="Lowercase emails"
                    description="Convert email addresses to lowercase."
                  />

                  <CleaningCheckbox
  checked={
    options.normalizePhones
  }
  onChange={(value) =>
    updateOption(
      "normalizePhones",
      value
    )
  }
  title="Normalize phone numbers"
  description="Remove unnecessary spaces, brackets, and symbols from phone numbers."
/>

<CleaningCheckbox
  checked={
    options.standardizeDates
  }
  onChange={(value) =>
    updateOption(
      "standardizeDates",
      value
    )
  }
  title="Standardize dates"
  description="Convert recognized dates to YYYY-MM-DD format."
/>

<CleaningCheckbox
  checked={
    options.normalizeHeaders
  }
  onChange={(value) =>
    updateOption(
      "normalizeHeaders",
      value
    )
  }
  title="Normalize column headers"
  description="Convert messy column names into clean, consistent headers."
/>

                  <CleaningCheckbox
                    checked={
                      options.removeEmptyColumns
                    }
                    onChange={(value) =>
                      updateOption(
                        "removeEmptyColumns",
                        value
                      )
                    }
                    title="Remove empty columns"
                    description="Remove columns containing no useful values."
                  />

                  <div className="md:col-span-2 rounded-2xl border border-sky-200 bg-sky-50 p-5 dark:border-sky-900/70 dark:bg-slate-950/60">
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Column Management
                      </h3>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        Select columns you do not want in the cleaned file. At least one column must remain.
                      </p>
                      <p className="mt-2 text-xs font-medium text-sky-800 dark:text-sky-300">
                        {Math.max(0, columns.length - options.columnsToRemove.length)} of {columns.length} columns will be kept
                      </p>
                    </div>

                    {columns.length === 0 ? (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        No columns are available to manage.
                      </p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {columns.map((column) => {
                          const selected = options.columnsToRemove.includes(column);
                          const remainingAfterSelection = columns.length - options.columnsToRemove.length;
                          const disableRemoval = !selected && remainingAfterSelection <= 1;

                          return (
                            <label
                              key={column}
                              className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-sm ${
                                selected
                                  ? "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
                                  : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300"
                              } ${disableRemoval ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                disabled={disableRemoval}
                                onChange={(event) => {
                                  const nextColumnsToRemove = event.target.checked
                                    ? [...options.columnsToRemove, column]
                                    : options.columnsToRemove.filter((item) => item !== column);
                                  updateOption("columnsToRemove", nextColumnsToRemove);
                                }}
                                className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                              />
                              <span className="min-w-0 flex-1 break-words">{column}</span>
                              {selected && (
                                <span className="text-xs font-semibold">Will remove</span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {options.columnsToRemove.length > 0 && (
                      <button
                        type="button"
                        onClick={() => updateOption("columnsToRemove", [])}
                        className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                      >
                        Clear column selections
                      </button>
                    )}
                  </div>

                  <CleaningCheckbox
                    checked={
                      options.removeEmptyRows
                    }
                    onChange={(value) =>
                      updateOption(
                        "removeEmptyRows",
                        value
                      )
                    }
                    title="Remove empty rows"
                    description="Delete rows where every cell is empty."
                  />

                  <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60">
  <div className="mb-4">
    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
      Custom validation rules
    </h3>

    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
      Define rules that your data should follow.
    </p>
  </div>

  <div className="grid gap-3 md:grid-cols-3">
    <select
      value={ruleColumn}
      onChange={(event) =>
        setRuleColumn(event.target.value)
      }
      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
    >
      <option value="">
        Select column
      </option>

      {columns.map((column) => (
        <option
          key={column}
          value={column}
        >
          {column}
        </option>
      ))}
    </select>

    <select
      value={ruleType}
      onChange={(event) =>
        setRuleType(
          event.target.value as ValidationRule["type"]
        )
      }
      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
    >
      <option value="email">
        Email must be valid
      </option>

      <option value="number">
        Value must be numeric
      </option>

      <option value="range">
        Value must be within range
      </option>

      <option value="allowed-values">
        Value must be allowed
      </option>
    </select>

    <button
      type="button"
      onClick={addValidationRule}
      disabled={!ruleColumn}
      className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Add rule
    </button>
  </div>

  {ruleType === "range" && (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <input
        type="number"
        placeholder="Minimum"
        value={ruleMin}
        onChange={(event) =>
          setRuleMin(event.target.value)
        }
        className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
      />

      <input
        type="number"
        placeholder="Maximum"
        value={ruleMax}
        onChange={(event) =>
          setRuleMax(event.target.value)
        }
        className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
      />
    </div>
  )}

  {ruleType === "allowed-values" && (
    <input
      type="text"
      placeholder="Allowed values, separated by commas"
      value={ruleAllowedValues}
      onChange={(event) =>
        setRuleAllowedValues(
          event.target.value
        )
      }
      className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
    />
  )}

  {validationRules.length > 0 && (
    <div className="mt-5 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Active rules
      </p>

      {validationRules.map((rule, index) => (
        <div
  key={`${rule.column}-${rule.type}-${index}`}
  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70"
>
          <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
              {rule.column}
            </p>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              {rule.type === "email" &&
                "Email must be valid"}

              {rule.type === "number" &&
                "Value must be numeric"}

              {rule.type === "range" &&
                `Range: ${rule.min}–${rule.max}`}

              {rule.type === "allowed-values" &&
                `Allowed: ${rule.allowedValues?.join(", ")}`}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setValidationRules((current) =>
                current.filter(
                  (_, ruleIndex) =>
                    ruleIndex !== index
                )
              )
            }
            className="text-xs font-medium text-red-400 hover:text-red-300"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  )}
</div>
                </div>

                                  {/* =================================
                      FIND & REPLACE
                  ================================= */}

                  <div className="md:col-span-2 mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
                    <div className="mb-5">
                      <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">
                        Find & Replace
                      </p>

                      <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                        Replace values across your data
                      </h3>

                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-500">
                        Find a value and replace it throughout the
                        spreadsheet before downloading.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label
                          htmlFor="find-text"
                          className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          Find
                        </label>

                        <input
                          id="find-text"
                          type="text"
                          value={options.findText}
                          onChange={(event) =>
                            updateOption(
                              "findText",
                              event.target.value
                            )
                          }
                          placeholder="e.g. N/A"
                          className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-600"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="replace-text"
                          className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          Replace with
                        </label>

                        <input
                          id="replace-text"
                          type="text"
                          value={options.replaceText}
                          onChange={(event) =>
                            updateOption(
                              "replaceText",
                              event.target.value
                            )
                          }
                          placeholder="e.g. Unknown"
                          className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-600"
                        />
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700">
                        <input
                          type="checkbox"
                          checked={
                            options.findCaseSensitive
                          }
                          onChange={(event) =>
                            updateOption(
                              "findCaseSensitive",
                              event.target.checked
                            )
                          }
                          className="mt-1 h-4 w-4 accent-blue-500"
                        />

                        <span>
                          <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                            Case sensitive
                          </span>

                          <span className="mt-1 block text-xs leading-5 text-slate-500">
                            Match uppercase and lowercase letters exactly.
                          </span>
                        </span>
                      </label>

                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-100 p-4 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700">
                        <input
                          type="checkbox"
                          checked={
                            options.findWholeCell
                          }
                          onChange={(event) =>
                            updateOption(
                              "findWholeCell",
                              event.target.checked
                            )
                          }
                          className="mt-1 h-4 w-4 accent-blue-500"
                        />

                        <span>
                          <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                            Whole cell only
                          </span>

                          <span className="mt-1 block text-xs leading-5 text-slate-500">
                            Replace only when the entire cell matches.
                          </span>
                        </span>
                      </label>
                    </div>

                    {options.findText !== "" && (
                      <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                        <p className="text-xs text-blue-300">
                          Find & Replace is ready. Matching values will be
                          replaced when you clean the file.
                        </p>
                      </div>
                    )}
                  </div>

                {options.removeDuplicates && (
                  <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
                    <h3 className="font-semibold">
                      Duplicate matching
                    </h3>

                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-500">
                      Choose how duplicate records
                      should be identified.
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <RadioOption
                        checked={
                          options.duplicateMode ===
                          "row"
                        }
                        onClick={() =>
                          updateOption(
                            "duplicateMode",
                            "row"
                          )
                        }
                        title="Entire row"
                        description="All columns must match."
                      />

                      <RadioOption
                        checked={
                          options.duplicateMode ===
                          "email"
                        }
                        onClick={() =>
                          updateOption(
                            "duplicateMode",
                            "email"
                          )
                        }
                        title="Email"
                        description="Match using email."
                      />

                      <RadioOption
                        checked={
                          options.duplicateMode ===
                          "phone"
                        }
                        onClick={() =>
                          updateOption(
                            "duplicateMode",
                            "phone"
                          )
                        }
                        title="Phone"
                        description="Match using phone."
                      />

                      <RadioOption
  checked={
    options.duplicateMode ===
    "columns"
  }
  onClick={() =>
    updateOption(
      "duplicateMode",
      "columns"
    )
  }
  title="Multiple columns"
  description="Match using selected columns."
/>
                    </div>

                    {options.duplicateMode === "columns" && (
  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
    <div>
      <h4 className="font-semibold text-slate-900 dark:text-white">
        Select duplicate columns
      </h4>

      <p className="mt-1 text-sm text-slate-600 dark:text-slate-500">
        A row is considered a duplicate only when
        all selected columns match.
      </p>
    </div>

    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {columns.map((column) => {
        const selected =
          options.duplicateColumns.includes(
            column
          );

        return (
          <label
            key={column}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
  selected
    ? "border-blue-500/40 bg-blue-500/10"
    : "border-slate-300 bg-white hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
}`}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={() => {
                const nextColumns = selected
                  ? options.duplicateColumns.filter(
                      (item) =>
                        item !== column
                    )
                  : [
                      ...options.duplicateColumns,
                      column,
                    ];

                updateOption(
                  "duplicateColumns",
                  nextColumns
                );
              }}
              className="h-4 w-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
            />

            <span className="truncate text-sm text-slate-800 dark:text-slate-300">
              {column}
            </span>
          </label>
        );
      })}
    </div>

    {options.duplicateColumns.length === 0 && (
      <p className="mt-3 text-xs text-yellow-400">
        Select at least one column. If none is
        selected, CleanFlow will use the entire row.
      </p>
    )}

    {options.duplicateColumns.length > 0 && (
      <p className="mt-3 text-xs text-blue-400">
        Matching on:{" "}
        {options.duplicateColumns.join(" + ")}
      </p>
    )}
  </div>
)}
                  </div>
                )}

                <div className="mt-8 flex flex-col items-center border-t border-slate-200 pt-8 dark:border-slate-800">
                  <button
                    onClick={runCleaning}
                    className="w-full rounded-xl bg-blue-600 px-8 py-4 font-semibold shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 sm:w-auto"
                  >
                    Preview cleaned data
                  </button>

                  <p className="mt-3 text-xs text-slate-500">
                    Your original file remains unchanged.
                  </p>
                </div>
              </div>
            )}
          </div>

{/* ================================
    COLUMN DIAGNOSTICS
================================= */}

{analysis &&
  analysis.columnDiagnostics.length > 0 && (
    <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">
          Column insights
        </p>

        <h2 className="mt-2 text-2xl font-bold">
          Understand your data
        </h2>

        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          CleanFlow profiles each column to identify
          missing data, duplicates, formatting issues
          and unusual values.
        </p>

        {/* ================================
    ISSUE CATEGORIES
================================= */}

{analysis.issues.length > 0 && (
  <div className="mb-8 grid gap-4 md:grid-cols-3">

    {/* SAFE */}

    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            Safe to fix
          </p>

          <p className="mt-1 text-xs text-slate-500">
            CleanFlow can handle these automatically.
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-lg text-emerald-400">
          ✓
        </div>
      </div>

      <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">
        {
          analysis.issues.filter(
            (issue) => issue.severity === "safe"
          ).length
        }
      </p>

      <p className="mt-1 text-xs text-slate-500">
        issue types detected
      </p>
    </div>

    {/* REVIEW */}

    <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 dark:border-yellow-500/20 dark:bg-yellow-500/5">
      <div className="flex items-center justify-between">
        <div>
        <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
            Review recommended
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Check these before making changes.
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/10 text-lg text-yellow-400">
          !
        </div>
      </div>

      <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">
        {
          analysis.issues.filter(
            (issue) => issue.severity === "review"
          ).length
        }
      </p>

      <p className="mt-1 text-xs text-slate-500">
        issue types detected
      </p>
    </div>

    {/* ATTENTION */}

    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-500/20 dark:bg-red-500/5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            Needs attention
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Potentially serious data problems.
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-lg text-red-400">
          !
        </div>
      </div>

      <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">
        {
          analysis.issues.filter(
            (issue) => issue.severity === "attention"
          ).length
        }
      </p>

      <p className="mt-1 text-xs text-slate-500">
        issue types detected
      </p>
    </div>
  </div>
)}

{analysis.issues.length > 0 && (
  <div className="space-y-3">
    {analysis.issues.map((issue) => {
      const styles =
  issue.severity === "safe"
    ? {
        border:
          "border-emerald-200 dark:border-emerald-500/20",
        background:
          "bg-emerald-50 dark:bg-emerald-500/5",
        text:
          "text-emerald-700 dark:text-emerald-400",
        badge:
          "bg-emerald-100 dark:bg-emerald-500/10",
        icon: "✓",
      }
    : issue.severity === "review"
    ? {
        border:
          "border-yellow-200 dark:border-yellow-500/20",
        background:
          "bg-yellow-50 dark:bg-yellow-500/5",
        text:
          "text-yellow-700 dark:text-yellow-400",
        badge:
          "bg-yellow-100 dark:bg-yellow-500/10",
        icon: "!",
      }
    : {
        border:
          "border-red-200 dark:border-red-500/20",
        background:
          "bg-red-50 dark:bg-red-500/5",
        text:
          "text-red-700 dark:text-red-400",
        badge:
          "bg-red-100 dark:bg-red-500/10",
        icon: "!",
      };

      return (
        <div
          key={issue.type}
          className={`rounded-2xl border ${styles.border} ${styles.background} p-5`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${styles.badge} ${styles.text} font-bold`}
              >
                {styles.icon}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {issue.label}
                  </h3>

                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${styles.badge} ${styles.text}`}
                  >
                    {issue.severity === "safe"
                      ? "Safe to fix"
                      : issue.severity === "review"
                      ? "Review recommended"
                      : "Needs attention"}
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {issue.description}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-left sm:text-right">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {issue.count}
              </p>

              <p className="text-xs text-slate-500">
                affected
              </p>
            </div>
          </div>
        </div>
      );
    })}
  </div>
)}

{analysis.issues.length === 0 && (
  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
    <p className="font-semibold text-emerald-600 dark:text-emerald-400">
      No quality issues detected
    </p>

    <p className="mt-1 text-sm text-slate-600 dark:text-slate-500">
      Your dataset looks clean based on the current checks.
    </p>
  </div>
)}
      </div>

      <div className="space-y-4">
        {analysis.columnDiagnostics.map(
          (column) => (
            <div
              key={column.name}
              className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 p-5"
            >
              {/* COLUMN HEADER */}

              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {column.name}
                    </h3>

                    <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-300">
                      {column.detectedType}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {column.totalValues.toLocaleString()} values
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Completeness
                  </p>

                  <p
                    className={`mt-1 text-2xl font-bold ${
                      column.completeness >= 90
                        ? "text-emerald-400"
                        : column.completeness >= 70
                        ? "text-yellow-400"
                        : "text-red-400"
                    }`}
                  >
                    {column.completeness}%
                  </p>
                </div>
              </div>

              {/* COMPLETENESS BAR */}

              <div className="mt-5">
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full ${
                      column.completeness >= 90
                        ? "bg-emerald-500"
                        : column.completeness >= 70
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{
                      width: `${column.completeness}%`,
                    }}
                  />
                </div>
              </div>

              {/* METRICS */}

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70 p-4">
                  <p className="text-xs text-slate-500">
                    Empty values
                  </p>

                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                    {column.emptyValues}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70 p-4">
                  <p className="text-xs text-slate-500">
                    Unique values
                  </p>

                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                    {column.uniqueValues}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70 p-4">
                  <p className="text-xs text-slate-500">
                    Uniqueness
                  </p>

                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                    {column.uniqueness}%
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70 p-4">
                  <p className="text-xs text-slate-500">
                    Invalid values
                  </p>

                  <p
                    className={`mt-1 text-xl font-bold ${
                      column.invalidValues > 0
                        ? "text-red-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {column.invalidValues}
                  </p>
                </div>
              </div>

              {/* ISSUES */}

              {(column.whitespaceIssues > 0 ||
                column.capitalizationIssues > 0) && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {column.whitespaceIssues > 0 && (
                    <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
                      <p className="text-sm font-medium text-yellow-300">
                        Whitespace issues
                      </p>

                      <p className="mt-1 text-xs text-yellow-200/60">
                        {column.whitespaceIssues} values contain
                        extra whitespace.
                      </p>
                    </div>
                  )}

                  {column.capitalizationIssues > 0 && (
                    <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
                      <p className="text-sm font-medium text-yellow-300">
                        Capitalization inconsistencies
                      </p>

                      <p className="mt-1 text-xs text-yellow-200/60">
                        {column.capitalizationIssues} values
                        use inconsistent capitalization.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TEXT LENGTH */}

              {column.detectedType === "Text" && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70 px-4 py-3">
                    <span className="text-xs text-slate-500">
                      Shortest
                    </span>

                    <span className="ml-2 font-semibold text-slate-900 dark:text-slate-200">
                      {column.minLength} chars
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70 px-4 py-3">
                    <span className="text-xs text-slate-500">
                      Longest
                    </span>

                    <span className="ml-2 font-semibold text-slate-900 dark:text-slate-200">
                      {column.maxLength} chars
                    </span>
                  </div>
                </div>
              )}

              {/* SAMPLE VALUES */}

              {column.sampleValues.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Sample values
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {column.sampleValues.map(
                      (value, index) => (
                        <span
                          key={`${column.name}-${index}`}
                          className="max-w-full truncate rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300"
                          title={value}
                        >
                          {value}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  )}

          {/* ================================
              CLEANING RESULTS
          ================================= */}

          {cleaningResult && (
            <div
              id="results"
              className="mt-8 scroll-mt-8"
            >
              <div className="rounded-3xl border border-emerald-500/20 bg-slate-900 p-6 sm:p-8">
                <div className="text-center">
                  <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
                    Step 3
                  </p>

                  <h2 className="mt-2 text-3xl font-bold">
                    Your data is cleaner
                  </h2>

                  <p className="mt-2 text-slate-600 dark:text-slate-400">
                    Review the changes before
                    downloading your cleaned file.
                  </p>
                </div>

                {/* QUALITY IMPROVEMENT */}

{analysis && cleanedAnalysis && (
  <div className="mt-10 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">
          Quality improvement
        </p>

        <h3 className="mt-2 text-2xl font-bold">
          Your data quality changed
        </h3>

        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          CleanFlow re-analyzed the dataset after
          applying your selected cleaning rules.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Before
          </p>

          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-300">
            {analysis.cleanlinessScore}%
          </p>
        </div>

        <span className="text-2xl text-slate-600">
          →
        </span>

        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            After
          </p>

          <p className="mt-1 text-3xl font-bold text-emerald-400">
            {cleanedAnalysis.cleanlinessScore}%
          </p>
        </div>
      </div>
    </div>

    <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50 px-4 py-3">
      <span className="text-sm text-slate-600 dark:text-slate-400">
        Quality score change
      </span>

      <span
        className={`font-bold ${
          qualityImprovement > 0
            ? "text-emerald-400"
            : qualityImprovement < 0
            ? "text-red-400"
            : "text-slate-400"
        }`}
      >
        {qualityImprovement > 0
          ? "+"
          : ""}
        {qualityImprovement} points
      </span>
    </div>
  </div>
)}

{/* DUPLICATE GROUPS */}

{(cleaningResult.duplicateGroups ?? []).length > 0 && (
  <div className="mt-8 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-6">
    <div>
      <p className="text-sm font-semibold uppercase tracking-wider text-orange-400">
        Duplicate review
      </p>

      <h3 className="mt-2 text-xl font-bold">
        Duplicate groups detected
      </h3>

      <p className="mt-1 text-sm text-slate-400">
        These groups contained matching values based
        on your selected duplicate rule.
      </p>
    </div>

    <div className="mt-5 space-y-3">
      {(cleaningResult.duplicateGroups ?? [])
  .slice(0, 10)
  .map((group, index) => (
          <div
            key={`${group.key}-${index}`}
            className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Group {index + 1}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Matching columns:{" "}
                  {group.columns.length > 0
                    ? group.columns.join(" + ")
                    : "Entire row"}
                </p>
              </div>

              <span className="w-fit rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-300">
                {group.count} matching rows
              </span>
            </div>

            <div className="mt-3 overflow-x-auto">
              <div className="flex min-w-max gap-2">
                {group.rowIndexes.map((rowIndex) => (
                  <span
                    key={rowIndex}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400"
                  >
                    Original row {rowIndex + 2}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
    </div>

    {(cleaningResult.duplicateGroups ?? []).length > 10 && (
      <p className="mt-4 text-center text-xs text-slate-500">
        Showing the first 10 duplicate groups.
      </p>
    )}
  </div>
)}

                {/* BEFORE / AFTER */}

                <div className="mt-10 grid gap-4 sm:grid-cols-2">
                  <BeforeAfterCard
                    title="Original"
                    value={data.length}
                    label="rows"
                  />

                  <BeforeAfterCard
                    title="Cleaned"
                    value={
                      cleaningResult
                        .cleanedData.length
                    }
                    label="rows"
                    positive
                  />
                </div>

{/* CHANGE SUMMARY */}

<div className="mt-8">
  <div className="mb-4">
    <h3 className="text-xl font-bold">
      Cleaning summary
    </h3>

    <p className="mt-1 text-sm text-slate-600 dark:text-slate-500">
      Here is exactly what CleanFlow changed.
    </p>
  </div>

  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <ChangeCard
      icon="↔"
      title="Duplicates removed"
      value={cleaningResult.removedDuplicates}
    />

    <ChangeCard
      icon="T"
      title="Spaces fixed"
      value={cleaningResult.trimmedCells}
    />

    <ChangeCard
      icon="A"
      title="Values normalized"
      value={cleaningResult.normalizedCells}
    />

    <ChangeCard
      icon="✎"
      title="Find & Replace"
      value={cleaningResult.findReplaceCount}
    />

    <ChangeCard
      icon="□"
      title="Empty rows removed"
      value={cleaningResult.removedEmptyRows}
    />

    <ChangeCard
      icon="▥"
      title="Columns removed"
      value={cleaningResult.removedColumns.length}
    />

    <ChangeCard
      icon="✓"
      title="Email values fixed"
      value={cleaningResult.normalizedEmails}
    />

    <ChangeCard
      icon="☎"
      title="Phone values fixed"
      value={cleaningResult.normalizedPhones}
    />

    <ChangeCard
      icon="📅"
      title="Dates standardized"
      value={cleaningResult.standardizedDates}
    />

    <ChangeCard
      icon="↔"
      title="Headers normalized"
      value={cleaningResult.normalizedHeaders}
    />
  </div>
</div>

<div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="font-semibold text-blue-300">
        Total changes
      </p>

      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        CleanFlow made these improvements to your dataset.
      </p>
    </div>

    <div className="text-3xl font-bold text-slate-900 dark:text-white">
      {cleaningResult.removedDuplicates +
        cleaningResult.trimmedCells +
        cleaningResult.normalizedCells +
        cleaningResult.findReplaceCount +
        cleaningResult.removedEmptyRows +
        cleaningResult.removedColumns.length +
        cleaningResult.normalizedEmails +
        cleaningResult.normalizedPhones +
        cleaningResult.standardizedDates +
        cleaningResult.normalizedHeaders}
    </div>
  </div>
</div>

                {/* REMOVED COLUMNS */}

                {cleaningResult
                  .removedColumns.length > 0 && (
                  <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-5 dark:border-yellow-500/20 dark:bg-yellow-500/5">
                    <p className="font-semibold text-yellow-300">
                      Empty columns removed
                    </p>

                    <p className="mt-2 text-sm text-yellow-200/70">
                      {cleaningResult.removedColumns.join(
                        ", "
                      )}
                    </p>
                  </div>
                )}

                {/* DATA PREVIEW */}

                <div className="mt-10">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold">
                      Cleaned data preview
                    </h3>

                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-500">
                      Showing the first 10 rows.
                    </p>
                  </div>

                  {cleaningResult.cleanedData
                    .length > 0 ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-800">
                      <div className="max-h-[420px] overflow-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead className="sticky top-0 bg-slate-800">
                            <tr>
                              {Object.keys(
                                cleaningResult.cleanedData[0]
                              ).map(
                                (column) => (
                                  <th
                                    key={
                                      column
                                    }
                                    className="whitespace-nowrap px-4 py-3 font-semibold text-slate-200"
                                  >
                                    {column}
                                  </th>
                                )
                              )}
                            </tr>
                          </thead>

                          <tbody>
                            {cleaningResult.cleanedData
                              .slice(0, 10)
                              .map(
                                (
                                  row,
                                  rowIndex
                                ) => (
                                  <tr
                                    key={
                                      rowIndex
                                    }
                                    className="border-t border-slate-200 dark:border-slate-800"
                                  >
                                    {Object.keys(
                                      cleaningResult.cleanedData[0]
                                    ).map(
                                      (
                                        column
                                      ) => (
                                        <td
                                          key={
                                            column
                                          }
                                          className="max-w-[250px] whitespace-nowrap px-4 py-3 text-slate-400"
                                        >
                                          {row[
                                            column
                                          ] || (
                                            <span className="text-slate-700">
                                              —
                                            </span>
                                          )}
                                        </td>
                                      )
                                    )}
                                  </tr>
                                )
                              )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-800 p-8 text-center text-slate-500">
                      No data remains after applying
                      these cleaning rules.
                    </div>
                  )}
                </div>

                {/* DOWNLOAD ACTIONS */}

<div className="mt-14 border-t border-slate-200 dark:border-slate-800 pt-10">
  <div className="mb-6 text-center">
    <h3 className="text-xl font-bold">
      Export your cleaned data
    </h3>

    <p className="mt-2 text-sm text-slate-600 dark:text-slate-500">
      Choose your preferred file format.
    </p>
  </div>

  <div className="mx-auto grid w-full max-w-3xl gap-4 sm:grid-cols-2">
    {/* CSV */}
    <button
      onClick={downloadCleanedCSV}
      disabled={
        cleaningResult.cleanedData.length === 0
      }
      className="flex h-14 w-full items-center justify-center rounded-xl bg-emerald-600 px-6 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Download cleaned CSV
    </button>

    {/* XLSX */}
    <button
      onClick={downloadCleanedXLSX}
      disabled={
        cleaningResult.cleanedData.length === 0
      }
      className="flex h-14 w-full items-center justify-center rounded-xl bg-blue-600 px-6 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Download Excel (.xlsx)
    </button>
  </div>

  <div className="mx-auto mt-4 w-full max-w-3xl">
    <button
      onClick={() => {
        setCleaningResult(null);
        setShowControls(true);

        setTimeout(() => {
          document
            .getElementById("cleaning-controls")
            ?.scrollIntoView({
              behavior: "smooth",
            });
        }, 100);
      }}
      className="flex h-14 w-full items-center justify-center rounded-xl border border-slate-700 px-6 font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-800/50 hover:text-white"
    >
      Change cleaning options
    </button>
  </div>

    <p className="mt-6 text-center text-xs text-emerald-400">
    Your files are processed locally in your browser.
  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ================================
          HOW IT WORKS
      ================================= */}

      <section
        id="how-it-works"
        className="border-t border-slate-200 dark:border-slate-800 px-6 py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">
              Simple process
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              Clean your data in three steps
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-slate-500">
              No complicated software. Upload,
              understand your data, clean it and
              download the result.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <StepCard
              number="01"
              title="Upload"
              description="Choose your CSV file and CleanFlow analyzes it automatically."
            />

            <StepCard
              number="02"
              title="Understand"
              description="See your data-quality score and exactly which problems were detected."
            />

            <StepCard
              number="03"
              title="Clean"
              description="Choose your cleaning rules, preview the result and download your cleaned CSV."
            />
          </div>
        </div>
      </section>

      {/* ================================
          PRIVACY
      ================================= */}

      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-8 text-center sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-xl">
            Lock
          </div>

          <h2 className="mt-5 text-2xl font-bold">
            Your data stays private
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-400">
            CleanFlow performs the current CSV
            cleaning operations directly in your
            browser. Your spreadsheet does not need
            to be uploaded to a server.
          </p>
        </div>
      </section>

      {/* ================================
          FOOTER
      ================================= */}

      <footer className="border-t border-slate-200 dark:border-slate-800 px-6 py-8">
        <div className="mx-auto max-w-6xl text-center text-sm text-slate-500">
          CleanFlow — Cleaner data, less work.
        </div>
      </footer>
    </main>
  );
}

/* ============================================
   SCORE CIRCLE
============================================ */

function ScoreCircle({
  score,
}: {
  score: number;
}) {
  const radius = 68;

  const circumference =
    2 * Math.PI * radius;

  const offset =
    circumference -
    (score / 100) * circumference;

  const scoreClass =
    score >= 90
      ? "text-emerald-400"
      : score >= 80
      ? "text-blue-400"
      : score >= 70
      ? "text-yellow-400"
      : score >= 60
      ? "text-orange-400"
      : "text-red-400";

  return (
    <div className="relative h-40 w-40">
      <svg
        className="h-full w-full -rotate-90"
        viewBox="0 0 160 160"
      >
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-slate-800"
        />

        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          className={scoreClass}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`text-4xl font-bold ${scoreClass}`}
        >
          {score}
        </span>

        <span className="text-xs text-slate-500">
          / 100
        </span>
      </div>
    </div>
  );
}

/* ============================================
   ISSUE CARD
============================================ */

function IssueCard({
  icon,
  title,
  value,
  description,
}: {
  icon: string;
  title: string;
  value: number;
  description: string;
}) {
  const clean = value === 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-sm font-bold text-slate-300 dark:bg-slate-800">
          {icon}
        </div>

        <span
          className={`text-2xl font-bold ${
            clean
              ? "text-emerald-400"
              : "text-orange-400"
          }`}
        >
          {value.toLocaleString()}
        </span>
      </div>

      <h3 className="mt-4 font-semibold">
        {title}
      </h3>

      <p className="mt-1 text-xs text-slate-500">
        {clean
          ? "No issues detected"
          : description}
      </p>
    </div>
  );
}

/* ============================================
   CLEANING CHECKBOX
============================================ */

function CleaningCheckbox({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer gap-4 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 p-5 transition hover:border-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        className="mt-1 h-5 w-5 accent-blue-600"
      />

      <div>
        <p className="font-medium">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </label>
  );
}

/* ============================================
   RADIO OPTION
============================================ */

function RadioOption({
  checked,
  onClick,
  title,
  description,
}: {
  checked: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        checked
          ? "border-blue-500 bg-blue-500/10"
          : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 hover:border-slate-700"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-full border ${
            checked
              ? "border-blue-500"
              : "border-slate-600"
          }`}
        >
          {checked && (
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          )}
        </div>

        <span className="font-medium">
          {title}
        </span>
      </div>

      <p className="mt-2 pl-8 text-xs text-slate-500">
        {description}
      </p>
    </button>
  );
}

/* ============================================
   BEFORE / AFTER CARD
============================================ */

function BeforeAfterCard({
  title,
  value,
  label,
  positive = false,
}: {
  title: string;
  value: number;
  label: string;
  positive?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        positive
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
      }`}
    >
      <p
        className={
          positive
            ? "text-sm text-emerald-400"
            : "text-sm text-slate-500"
        }
      >
        {title}
      </p>

      <div className="mt-2 flex items-end gap-2">
        <span className="text-3xl font-bold">
          {value.toLocaleString()}
        </span>

        <span className="pb-1 text-sm text-slate-500">
          {label}
        </span>
      </div>
    </div>
  );
}

/* ============================================
   CHANGE CARD
============================================ */

function ChangeCard({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-sm font-bold text-emerald-400">
        {icon}
      </div>

      <p className="mt-4 text-2xl font-bold">
        {value.toLocaleString()}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {title}
      </p>
    </div>
  );
}

/* ============================================
   STEP CARD
============================================ */

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-blue-500">
          {number}
        </span>

        <span className="text-slate-700">
          →
        </span>
      </div>

      <h3 className="mt-6 text-lg font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}
