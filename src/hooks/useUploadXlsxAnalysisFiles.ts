import { useMutation } from "@tanstack/react-query";
import { PortfolioAnalysis } from "@/xlsx-parser/types";

export const useUploadXlsxAnalysisFiles = (onSuccess: (data: PortfolioAnalysis) => void) => {
  return useMutation<PortfolioAnalysis, Error, File[]>({
    mutationFn: async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) {
        throw new Error("No files have been uploaded.");
      }
      const file = acceptedFiles[0];
      if (!file.name.endsWith(".xlsx")) {
        throw new Error("Only XLSX files allowed.");
      }
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        return (await res.json()) as PortfolioAnalysis;
      } else {
        throw new Error(await res.text());
      }
    },
    onSuccess,
  });
};
