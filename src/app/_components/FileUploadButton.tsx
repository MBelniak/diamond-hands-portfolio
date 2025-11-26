import { Upload } from "lucide-react";
import React from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ReportUploadDropzone } from "@/app/_components/ReportUploadDropzone";

export const FileUploadButton = () => {
  return (
    <Dialog>
      <DialogTrigger title={"Upload a new file"}>
        <div
          className={
            "rounded-[50%] aspect-square w-9 flex items-center justify-center bg-white/10 hover:bg-white/20 cursor-pointer"
          }
        >
          <Upload />
        </div>
      </DialogTrigger>
      <DialogContent>
        <h3>Upload new transactions</h3>
        <ReportUploadDropzone />
      </DialogContent>
    </Dialog>
  );
};
