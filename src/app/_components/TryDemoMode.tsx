"use client";

import { Button } from "@/components/ui/button";
import React from "react";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";

export const TryDemoMode = () => {
  const { setDemoMode } = useStore();
  const router = useRouter();

  const handleDemoMode = () => {
    setDemoMode(true);
    router.replace("/");
    router.refresh();
  };

  return (
    <div className={"flex flex-col items-center justify-center gap-6"}>
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
