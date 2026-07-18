"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { TransactionType } from "@/app/(analysis)/transactions/_types";

const TYPE_OPTIONS: { label: string; value: TransactionType }[] = [
  { label: "Buy", value: "buy" },
  { label: "Sell", value: "sell" },
  { label: "Deposit", value: "deposit" },
  { label: "Withdrawal", value: "withdrawal" },
];

interface TransactionFiltersProps {
  selectedTypes: TransactionType[];
  onTypesChange: (types: TransactionType[]) => void;
  availableTickers: string[];
  selectedTickers: string[];
  onTickersChange: (tickers: string[]) => void;
}

export function TransactionFilters({
  selectedTypes,
  onTypesChange,
  availableTickers,
  selectedTickers,
  onTickersChange,
}: TransactionFiltersProps) {
  const [typeOpen, setTypeOpen] = React.useState(false);
  const [tickerOpen, setTickerOpen] = React.useState(false);

  const toggleType = (value: TransactionType) => {
    if (selectedTypes.includes(value)) {
      onTypesChange(selectedTypes.filter((t) => t !== value));
    } else {
      onTypesChange([...selectedTypes, value]);
    }
  };

  const toggleTicker = (ticker: string) => {
    if (selectedTickers.includes(ticker)) {
      onTickersChange(selectedTickers.filter((t) => t !== ticker));
    } else {
      onTickersChange([...selectedTickers, ticker]);
    }
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Type filter */}
      <Popover open={typeOpen} onOpenChange={setTypeOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={typeOpen} className="min-w-[160px] justify-between">
            <span className="truncate">
              {selectedTypes.length === 0
                ? "Filter by type…"
                : selectedTypes.length === 1
                  ? TYPE_OPTIONS.find((o) => o.value === selectedTypes[0])?.label
                  : `${selectedTypes.length} types`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandList>
              <CommandGroup>
                {TYPE_OPTIONS.map((option) => (
                  <CommandItem key={option.value} value={option.value} onSelect={() => toggleType(option.value)}>
                    <Check
                      className={cn("mr-2 h-4 w-4", selectedTypes.includes(option.value) ? "opacity-100" : "opacity-0")}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Ticker filter */}
      <Popover open={tickerOpen} onOpenChange={setTickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={tickerOpen}
            className="min-w-[160px] justify-between"
          >
            <span className="truncate">
              {selectedTickers.length === 0
                ? "Filter by ticker…"
                : selectedTickers.length === 1
                  ? selectedTickers[0]
                  : `${selectedTickers.length} tickers`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0">
          <Command>
            <CommandInput placeholder="Search ticker…" />
            <CommandList>
              <CommandEmpty>No tickers found.</CommandEmpty>
              <CommandGroup>
                {availableTickers.map((ticker) => (
                  <CommandItem key={ticker} value={ticker} onSelect={() => toggleTicker(ticker)}>
                    <Check
                      className={cn("mr-2 h-4 w-4", selectedTickers.includes(ticker) ? "opacity-100" : "opacity-0")}
                    />
                    {ticker}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Active filter badges */}
      {selectedTypes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTypes.map((t) => (
            <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => toggleType(t)}>
              {TYPE_OPTIONS.find((o) => o.value === t)?.label}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
      {selectedTickers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTickers.map((ticker) => (
            <Badge key={ticker} variant="secondary" className="cursor-pointer" onClick={() => toggleTicker(ticker)}>
              {ticker}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
