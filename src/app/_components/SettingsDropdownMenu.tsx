import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CogIcon } from "lucide-react";
import React from "react";
import { SettingsPopover } from "@/app/_components/SettingsPopover";

export const SettingsDropdownMenu: React.FC = () => {
  return (
    <Popover>
      <PopoverTrigger>
        <div
          className={
            "rounded-[50%] aspect-square w-9 flex items-center justify-center bg-white/10 hover:bg-white/20 cursor-pointer"
          }
        >
          <CogIcon />
        </div>
      </PopoverTrigger>
      <PopoverContent>
        <SettingsPopover />
      </PopoverContent>
    </Popover>
  );
};
