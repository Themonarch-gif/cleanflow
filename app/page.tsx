"use client";

import { useState } from "react";
import FileUploader from "@/components/FileUploader";
import {
  analyzeCSV,
  AnalysisResult,
  CSVRow,
} from "@/lib/analyzer";
import {
  cleanCSV,
  CleaningOptions,
  CleaningResult,
  convertToCSV,
} from "@/lib/cleaner";

const defaultOptions: CleaningOptions = {
  removeDuplicates: true,
  trimWhitespace: true,
  normalizeCapitalization: true,
  lowercaseEmails: true,
  removeEmptyColumns: true,
  removeEmptyRows: false,
  duplicateMode: "row",
};

export default function Home() {
  const [analysis, setAnalysis] =
    useState<AnalysisResult | null>(null);

  const [fileName, setFileName] = useState("");

  const [data, setData] = useState<CSVRow[]>([]);

  const [columns, setColumns] = useState<string[]>([]);

  const [cleaningResult, setCleaningResult] =
    useState<CleaningResult | null>(null);

  const [options, setOptions] =
    useState<CleaningOptions>(defaultOptions);

  const [showControls, setShowControls] = useState(true);

  const handleFileLoaded = (
    uploadedData: CSVRow[],
    uploadedFileName: string
  ) => {
    const detectedColumns =
      uploadedData.length > 0
        ? Object.keys(uploadedData[0])
        : [];

    const result = analyzeCSV(
      uploadedData,
      detectedColumns
    );

    setData(uploadedData);
    setColumns(detectedColumns);
    setFileName(uploadedFileName);
    setAnalysis(result);
    setCleaningResult(null);
    setOptions(defaultOptions);
    setShowControls(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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

  const runCleaning = () => {
    if (!analysis || data.length === 0) {
      return;
    }

    const result = cleanCSV(
      data,
      columns,
      options
    );

    setCleaningResult(result);
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
    setCleaningResult(null);
    setOptions(defaultOptions);
    setShowControls(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* ================================
          NAVIGATION
      ================================= */}

      <nav className="border-b border-slate-800/80">
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

          <button
            onClick={() =>
              document
                .getElementById("how-it-works")
                ?.scrollIntoView({
                  behavior: "smooth",
                })
            }
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            How it works
          </button>
        </div>
      </nav>

      {/* ================================
          HERO
      ================================= */}

      {!analysis && (
        <section className="mx-auto max-w-5xl px-6 pb-20 pt-20 text-center">
          <div className="mx-auto mb-6 inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300">
            Smart spreadsheet cleaning
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl">
            Clean your spreadsheet
            <span className="block text-blue-500">
              without the headache.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Detect duplicates, missing values,
            formatting problems and other common
            spreadsheet issues in seconds.
          </p>

          <FileUploader
            onFileLoaded={handleFileLoaded}
          />
        </section>
      )}

      {/* ================================
          ANALYSIS DASHBOARD
      ================================= */}

      {analysis && (
        <section className="mx-auto max-w-6xl px-6 pb-24 pt-12">
          {/* FILE HEADER */}

          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Analyzed file
              </p>

              <h2 className="mt-1 break-all text-2xl font-bold">
                {fileName}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {analysis.totalRows.toLocaleString()}{" "}
                rows · {analysis.totalColumns} columns
              </p>
            </div>

            <button
              onClick={resetApp}
              className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Upload another file
            </button>
          </div>

          {/* ================================
              SCORE + REPORT
          ================================= */}

          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            {/* SCORE CARD */}

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
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

                <p className="mt-1 text-slate-400">
                  {analysis.qualityLabel}
                </p>
              </div>

              <div className="mt-8">
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-slate-500">
                    Quality score
                  </span>

                  <span className="font-semibold text-slate-300">
                    {analysis.cleanlinessScore}%
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-800">
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

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">
                Quality report
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Issues found
              </h2>

              <p className="mt-2 text-sm text-slate-500">
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
            className="mt-8 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900"
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

                <p className="mt-1 text-sm text-slate-500">
                  You stay in control of every change.
                </p>
              </div>

              <span className="text-2xl text-slate-500">
                {showControls ? "−" : "+"}
              </span>
            </button>

            {showControls && (
              <div className="border-t border-slate-800 px-6 py-6">
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
                </div>

                {options.removeDuplicates && (
                  <div className="mt-8 border-t border-slate-800 pt-6">
                    <h3 className="font-semibold">
                      Duplicate matching
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Choose how duplicate records
                      should be identified.
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
                    </div>
                  </div>
                )}

                <div className="mt-8 flex flex-col items-center border-t border-slate-800 pt-8">
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

                  <p className="mt-2 text-slate-400">
                    Review the changes before
                    downloading your cleaned file.
                  </p>
                </div>

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

                {/* CHANGE CARDS */}

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <ChangeCard
                    icon="↔"
                    title="Duplicates removed"
                    value={
                      cleaningResult
                        .removedDuplicates
                    }
                  />

                  <ChangeCard
                    icon="T"
                    title="Spaces fixed"
                    value={
                      cleaningResult
                        .trimmedCells
                    }
                  />

                  <ChangeCard
                    icon="A"
                    title="Values normalized"
                    value={
                      cleaningResult
                        .normalizedCells
                    }
                  />

                  <ChangeCard
                    icon="□"
                    title="Empty rows removed"
                    value={
                      cleaningResult
                        .removedEmptyRows
                    }
                  />
                </div>

                {/* REMOVED COLUMNS */}

                {cleaningResult
                  .removedColumns.length > 0 && (
                  <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5">
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

                    <p className="mt-1 text-sm text-slate-500">
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
                                    className="border-t border-slate-800"
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

                {/* DOWNLOAD */}

                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <button
                    onClick={
                      downloadCleanedCSV
                    }
                    disabled={
                      cleaningResult.cleanedData
                        .length === 0
                    }
                    className="rounded-xl bg-emerald-600 px-8 py-4 font-semibold transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Download cleaned CSV
                  </button>

                  <button
                    onClick={() => {
                      setCleaningResult(null);
                      setShowControls(true);

                      setTimeout(() => {
                        document
                          .getElementById(
                            "cleaning-controls"
                          )
                          ?.scrollIntoView({
                            behavior: "smooth",
                          });
                      }, 100);
                    }}
                    className="rounded-xl border border-slate-700 px-8 py-4 font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
                  >
                    Change cleaning options
                  </button>
                </div>

                <div className="mt-6 text-center text-xs text-emerald-400">
                  Your CSV is processed locally in
                  your browser.
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
        className="border-t border-slate-800 px-6 py-20"
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
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center sm:p-12">
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

      <footer className="border-t border-slate-800 px-6 py-8">
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
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-sm font-bold text-slate-300">
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
    <label className="flex cursor-pointer gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-5 transition hover:border-slate-700">
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
          : "border-slate-800 bg-slate-950 hover:border-slate-700"
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
          : "border-slate-800 bg-slate-950"
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
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
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