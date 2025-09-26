"use client";
import React from "react";
import { useDropzone } from "react-dropzone";
import { useStore } from "../lib/store";
import { redirect } from "next/navigation";
import { DiamondLoader } from "@/components/ui/DiamondLoader";
import { useUploadXlsxAnalysisFiles } from "@/hooks/useUploadXlsxAnalysisFiles";

export default function Home() {
  const { portfolioAnalysis, setPortfolioAnalysis } = useStore();
  const { mutate: onDrop, isPending: isUploading, error } = useUploadXlsxAnalysisFiles(setPortfolioAnalysis);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => onDrop(files),
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    multiple: false,
  });

  if (portfolioAnalysis != null) {
    redirect("/performance");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
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
      {error && <p className="mt-4 text-center text-sm text-red-500">{error.message}</p>}
    </div>
  );
}
