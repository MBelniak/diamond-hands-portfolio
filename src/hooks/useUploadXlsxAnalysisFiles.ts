import { useMutation } from "@tanstack/react-query";

export const useUploadXlsxAnalysisFiles = (onSuccess: () => void) => {
  return useMutation<void, Error, File[]>({
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
        return;
      } else {
        throw new Error(await res.text());
      }
    },
    onSuccess,
  });
};
