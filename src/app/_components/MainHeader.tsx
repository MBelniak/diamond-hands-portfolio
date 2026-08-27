"use client";
import React, { useEffect, useState } from "react";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { SettingsDropdownMenu } from "@/components/settings/SettingsDropdownMenu";
import { FileUploadButton } from "./FileUploadButton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export const MainHeader = ({
  withSidebar = false,
  initialDemoMode,
}: {
  withSidebar?: boolean;
  initialDemoMode?: boolean;
}) => {
  const { demoMode: storeDemoMode, setDemoMode } = useStore();
  const [demoMode, setDemoModeState] = useState(initialDemoMode ?? storeDemoMode);
  const router = useRouter();

  useEffect(() => {
    setDemoModeState(storeDemoMode);
  }, [storeDemoMode]);

  const handleExitDemoMode = () => {
    setDemoMode(false);
    router.replace("/");
    router.refresh();
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
          <div className="flex items-center gap-2">
            <SignInButton>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <LogIn className="size-4" />
                Sign In
              </Button>
            </SignInButton>
            <SignUpButton>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Sparkles className="size-4" />
                Sign Up
              </Button>
            </SignUpButton>
          </div>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </header>
  );
};
