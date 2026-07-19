"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ComboboxOption {
  value: string;
  label: string;
}

interface CreatableComboboxProps {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  createLabel?: string;
}

export function CreatableCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  emptyText = "No results found.",
  createLabel = "Create",
}: CreatableComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleSelect = (currentValue: string) => {
    onValueChange(currentValue);
    setOpen(false);
    setInputValue(""); // Reset on close
  };

  const showCreateOption =
    inputValue.trim().length > 0 &&
    !options.some(
      (opt) => opt.label.toLowerCase() === inputValue.trim().toLowerCase()
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10 bg-white font-normal shadow-sm border-zinc-200"
        >
          <span className="truncate">
            {value
              ? (options.find((opt) => opt.value === value)?.label || value)
              : <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 flex-none" />
        </Button>
      </PopoverTrigger>
      {/* 
        Using popover content width styling dynamically so the dropdown 
        matches the exact width of the trigger button on layout
      */}
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={placeholder}
            value={inputValue}
            onValueChange={setInputValue}
            className="outline-none border-none ring-0 focus-visible:ring-0"
          />
          <CommandList className="max-h-[220px] overflow-y-auto">
            <CommandEmpty>
              {inputValue ? (
                <div 
                  className="flex items-center gap-2 px-2 py-2 text-sm cursor-pointer hover:bg-muted text-primary font-medium"
                  onClick={() => handleSelect(inputValue.trim())}
                >
                  <Plus className="w-4 h-4" />
                  <span>{createLabel} "{inputValue.trim()}"</span>
                </div>
              ) : (
                <span className="text-zinc-500">{emptyText}</span>
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  // We map `value` here to `option.label` for command filtering 
                  // to properly fuzzy search by the visible label text.
                  value={option.label}
                  onSelect={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100 text-primary" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
              {showCreateOption && (
                <CommandItem
                  // The value matches the custom string filter so it remains visible
                  value={`CREATE_${inputValue}`}
                  onSelect={() => handleSelect(inputValue.trim())}
                  className="font-medium text-indigo-600 focus:text-indigo-700 bg-indigo-50/30 font-semibold"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {createLabel} "{inputValue.trim()}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
