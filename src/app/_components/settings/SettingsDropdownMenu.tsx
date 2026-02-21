"use client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CogIcon } from "lucide-react";
import React, { useState } from "react";
import { SettingsPopover } from "@/app/_components/settings/SettingsPopover";

export const SettingsDropdownMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen}>
      <PopoverTrigger title={"Settings"} asChild onClick={() => setIsOpen((open) => !open)}>
        <div
          className={
            "rounded-[50%] aspect-square w-9 flex items-center justify-center bg-white/10 hover:bg-white/20 cursor-pointer"
          }
        >
          <CogIcon />
        </div>
      </PopoverTrigger>
      <PopoverContent>
        <SettingsPopover onRequestCloseAction={() => setIsOpen(false)} />
      </PopoverContent>
    </Popover>
  );
};
