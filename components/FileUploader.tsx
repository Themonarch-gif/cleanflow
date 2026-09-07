"use client";

import { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

type CSVRow = Record<string, string>;

interface FileUploaderProps {
  onFileLoaded: (data: CSVRow[], fileName: string) => void;
}

export default function FileUploader({
  onFileLoaded,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const processFile = (file: File) => {
    setError("");

    const fileName = file.name.toLowerCase();

    const isCSV = fileName.endsWith(".csv");
    const isExcel =
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".xls");

    if (!isCSV && !isExcel) {
      setError(
        "Please choose a CSV or Excel file (.csv, .xlsx, or .xls)."
      );
      return;
    }

    setIsProcessing(true);

    // ----------------------------------------
    // Excel files
    // ----------------------------------------

    if (isExcel) {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const arrayBuffer = event.target?.result;

          if (!(arrayBuffer instanceof ArrayBuffer)) {
            throw new Error("Could not read the Excel file.");
          }

          const workbook = XLSX.read(arrayBuffer, {
            type: "array",
          });

          if (workbook.SheetNames.length === 0) {
            throw new Error(
              "This Excel file does not contain any worksheets."
            );
          }

          // Use the first worksheet
          const firstSheetName =
            workbook.SheetNames[0];

          const worksheet =
            workbook.Sheets[firstSheetName];

          const data = XLSX.utils.sheet_to_json<
            CSVRow
          >(worksheet, {
            defval: "",
            raw: false,
          });

          if (data.length === 0) {
            setError(
              "This Excel file appears to be empty."
            );
            setIsProcessing(false);
            return;
          }

          setIsProcessing(false);

          onFileLoaded(data, file.name);
        } catch (error) {
          setIsProcessing(false);

          setError(
            error instanceof Error
              ? error.message
              : "Could not read the Excel file."
          );
        }
      };

      reader.onerror = () => {
        setIsProcessing(false);
        setError("Could not read the Excel file.");
      };

      reader.readAsArrayBuffer(file);

      return;
    }

    // ----------------------------------------
    // CSV files
    // ----------------------------------------

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
          setError(
            "This CSV file appears to be empty."
          );
          return;
        }

        onFileLoaded(
          results.data,
          file.name
        );
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

    event.target.value = "";
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    setIsDragging(false);

    const file =
      event.dataTransfer.files?.[0];

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
      onDragLeave={() =>
        setIsDragging(false)
      }
      onDrop={handleDrop}
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10 text-3xl">
        {isProcessing ? "⏳" : "📄"}
      </div>

      <h2 className="mt-6 text-xl font-semibold">
        {isProcessing
          ? "Processing your file..."
          : "Drop your CSV or Excel file here"}
      </h2>

      <p className="mt-2 text-sm text-slate-400">
        {isProcessing
          ? "Please wait while we read your data."
          : "or choose a file from your computer"}
      </p>

      {!isProcessing && (
        <label className="mt-6 inline-flex cursor-pointer items-center rounded-xl bg-blue-600 px-6 py-3 font-medium transition hover:bg-blue-500">
          Choose file

          <input
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
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
        CSV and Excel files are processed locally
        in your browser.
      </p>
    </div>
  );
}