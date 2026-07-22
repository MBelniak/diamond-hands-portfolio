"use client";

import React from "react";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { SettingsDropdownMenu } from "@/components/settings/SettingsDropdownMenu";
import { FileUploadButton } from "./FileUploadButton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export const MainHeader = ({ withSidebar = false }: { withSidebar?: boolean }) => {
  const { demoMode, setDemoMode } = useStore();
  const router = useRouter();

  const handleExitDemoMode = () => {
    setDemoMode(false);
    router.push("/");
  };

  return (
    <header className="flex items-center p-4 gap-4 h-16">
      {withSidebar && <SidebarTrigger className="md:hidden" />}
      <div className="ml-auto flex items-center gap-4">
        <SettingsDropdownMenu />
        {demoMode ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExitDemoMode}
            className="flex items-center gap-2"
            title="Exit demo mode"
          >
            <LogOut className="w-4 h-4" />
            Exit Demo
          </Button>
        ) : (
          <FileUploadButton />
        )}
        <SignedOut>
          <SignInButton />
          <SignUpButton>
            <button className="bg-[#6c47ff] text-ceramic-white rounded-full w-9 aspect-square font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
              Sign Up
            </button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </header>
  );
};
