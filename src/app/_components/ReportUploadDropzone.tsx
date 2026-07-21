"use client";
import { DiamondLoader } from "@/components/ui/DiamondLoader";
import React from "react";
import { useDropzone } from "react-dropzone";
import { useUploadXlsxAnalysisFiles } from "@/hooks/useUploadXlsxAnalysisFiles";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { useStore } from "@/lib/store";
import { portfolioDataDB } from "@/client/indexedDB/portfolioDataDB";
import { Button } from "@/components/ui/button";

export const ReportUploadDropzone = () => {
  const { refetch: refetchPortfolio } = usePortfolioAnalysis();
  const { selectedPortfolio, setDemoMode } = useStore();

  const {
    mutate: onDrop,
    isPending: isUploading,
    error: uploadError,
  } = useUploadXlsxAnalysisFiles(() => {
    portfolioDataDB.removePortfolioData(selectedPortfolio).then(() => refetchPortfolio());
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => onDrop({ acceptedFiles: files, selectedPortfolio }),
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    multiple: false,
  });

  const handleDemoMode = () => {
    setDemoMode(true);
    refetchPortfolio();
  };

  return (
    <div className={"flex flex-col items-center justify-center gap-6"}>
      <div>
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
          <div className={"flex flex-col items-center justify-center gap-6"}>
            <DiamondLoader />
            <p className="mt-4 text-center text-sm text-blue-500">Uploading file...</p>
          </div>
        )}
        {uploadError && <p className="mt-4 text-center text-sm text-red-500">{uploadError.message}</p>}
      </div>

      <div className="flex items-center gap-4">
        <div className="h-px bg-gray-300 flex-1 w-24" />
        <span className="text-gray-500 text-sm">or</span>
        <div className="h-px bg-gray-300 flex-1 w-24" />
      </div>

      <Button variant="secondary" onClick={handleDemoMode} className="w-96">
        Try Demo Mode
      </Button>
    </div>
  );
};
