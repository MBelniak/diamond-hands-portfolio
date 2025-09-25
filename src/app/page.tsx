"use client";
import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useStore } from "../lib/store";
import { redirect } from "next/navigation";
import { DiamondLoader } from "@/components/ui/DiamondLoader";

export default function Home() {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const { portfolioAnalysis, setPortfolioAnalysis } = useStore();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;
      const file = acceptedFiles[0];
      setUploading(true);
      setMessage("");
      if (!file.name.endsWith(".xlsx")) {
        setMessage("Only XLSX files allowed.");
        setUploading(false);
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("File has been uploaded: " + data.filename);
        setPortfolioAnalysis(data);
      } else {
        setMessage(data.error || "An error occurred while uploading the file.");
      }
      setUploading(false);
    },
    [setPortfolioAnalysis],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
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
      {!uploading && (
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
      {uploading && (
        <>
          <DiamondLoader />
          <p className="mt-4 text-center text-sm text-blue-500">Uploading file...</p>
        </>
      )}
      {message && <p className="mt-4 text-center text-sm text-red-500">{message}</p>}
    </div>
  );
}
