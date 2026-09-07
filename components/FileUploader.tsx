"use client";

import { useState } from "react";
import Papa from "papaparse";

type CSVRow = Record<string, string>;

interface FileUploaderProps {
  onFileLoaded: (data: CSVRow[], fileName: string) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function FileUploader({
  onFileLoaded,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const processFile = (file: File) => {
    setError("");

    // ----------------------------------------
    // 1. Check file type
    // ----------------------------------------

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please choose a CSV file.");
      return;
    }

    // ----------------------------------------
    // 2. Check file size
    // ----------------------------------------

    if (file.size > MAX_FILE_SIZE) {
      setError(
        "This file is too large. Please choose a CSV file smaller than 10 MB."
      );
      return;
    }

    // ----------------------------------------
    // 3. Process CSV
    // ----------------------------------------

    setIsProcessing(true);

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,

      complete: (results) => {
        setIsProcessing(false);

        if (results.errors.length > 0) {
          console.warn(
            "CSV parsing warnings:",
            results.errors
          );
        }

        if (results.data.length === 0) {
          setError("This CSV file appears to be empty.");
          return;
        }

        onFileLoaded(results.data, file.name);
      },

      error: (error) => {
        setIsProcessing(false);
        setError(
          `Could not read the CSV file: ${error.message}`
        );
      },
    });
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      processFile(file);
    }

    // Allow selecting the same file again
    event.target.value = "";
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      processFile(file);
    }
  };

  return (
    <div
      className={`mx-auto mt-12 max-w-2xl rounded-3xl border-2 border-dashed p-10 transition ${
        isDragging
          ? "border-blue-400 bg-blue-500/10"
          : "border-slate-700 bg-slate-900"
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10 text-3xl">
        {isProcessing ? "..." : "CSV"}
      </div>

      <h2 className="mt-6 text-xl font-semibold">
        {isProcessing
          ? "Processing your CSV..."
          : "Drop your CSV file here"}
      </h2>

      <p className="mt-2 text-sm text-slate-400">
        {isProcessing
          ? "Please wait while we read your data."
          : "or choose a file from your computer"}
      </p>

      {!isProcessing && (
        <label className="mt-6 inline-flex cursor-pointer items-center rounded-xl bg-blue-600 px-6 py-3 font-medium transition hover:bg-blue-500">
          Choose CSV file

          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      )}

      {error && (
        <div className="mx-auto mt-5 max-w-md rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">
        Maximum file size: 10 MB
      </p>

      <p className="mt-1 text-xs text-slate-500">
        Your file is processed locally in your browser.
      </p>
    </div>
  );
}