"use client";
import { DiamondLoader } from "@/components/ui/DiamondLoader";
import React from "react";
import { useDropzone } from "react-dropzone";
import { useUploadXlsxAnalysisFiles } from "@/hooks/useUploadXlsxAnalysisFiles";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { portfolioDataDB } from "@/lib/utils";

export const ReportUploadDropzone = () => {
  const { refetch: refetchPortfolio } = usePortfolioAnalysis();

  const {
    mutate: onDrop,
    isPending: isUploading,
    error: uploadError,
  } = useUploadXlsxAnalysisFiles(() => {
    portfolioDataDB.removePortfolioData().then(() => refetchPortfolio());
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => onDrop(files),
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    multiple: false,
  });

  return (
    <div className={"flex flex-col items-center justify-center"}>
      <h1 className="text-2xl font-bold mb-6">Upload XLSX file</h1>
      {!isUploading && (
        <div
          {...getRootProps()}
          className={`w-96 h-48 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white"}`}
        >
          <input {...getInputProps()} />
          <span className="text-gray-500">
            {isDragActive ? "Drop XLSX file here..." : "Drag XLSX file here or click to select"}
          </span>
        </div>
      )}
      {isUploading && (
        <>
          <DiamondLoader />
          <p className="mt-4 text-center text-sm text-blue-500">Uploading file...</p>
        </>
      )}
      {uploadError && <p className="mt-4 text-center text-sm text-red-500">{uploadError.message}</p>}
    </div>
  );
};
