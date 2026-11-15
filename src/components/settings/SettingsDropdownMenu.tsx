"use client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CogIcon } from "lucide-react";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { SettingsPopover } from "@/components/settings/SettingsPopover";

export const SettingsDropdownMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen}>
      <PopoverTrigger title={"Settings"} asChild>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          aria-label="Settings"
          onClick={() => setIsOpen((open) => !open)}
        >
          <CogIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <SettingsPopover onRequestClose={() => setIsOpen(false)} />
      </PopoverContent>
    </Popover>
  );
};
