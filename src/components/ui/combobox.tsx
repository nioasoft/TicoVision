import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxOption {
  value: string
  label: string
}

export interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  emptyText?: string
  className?: string
  disabled?: boolean
  allowCustomValue?: boolean
  /** Custom label for the "add custom value" option. Use {value} as placeholder for the typed text. Default: 'הוסף: "{value}"' */
  customValueLabel?: string
}

export function Combobox({
  options,
  value,
  onValueChange,
  emptyText = "לא נמצאו תוצאות",
  className,
  disabled = false,
  allowCustomValue = false,
  customValueLabel,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  // Safety check: ensure options is always an array
  const safeOptions = options || []
  const selectedOption = safeOptions.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) setSearchValue("")
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between rtl:text-right ltr:text-left h-11 rounded-md border border-[hsl(40,80%,85%)] bg-[hsl(45,100%,96%)] px-3 py-2 text-[17px] shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-[hsl(45,95%,50%)] focus:ring-offset-2 hover:bg-[hsl(45,100%,94%)]",
            value ? "text-foreground" : "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : (value || '')}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 rtl:ml-0 rtl:mr-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput

            className="rtl:text-right ltr:text-left"
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty className="rtl:text-right ltr:text-left p-0">
              {allowCustomValue && searchValue.trim() ? (
                <div
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground rtl:text-right ltr:text-left"
                  onClick={() => {
                    onValueChange?.(searchValue.trim())
                    setSearchValue("")
                    setOpen(false)
                  }}
                >
                  {customValueLabel
                    ? customValueLabel.replace('{value}', searchValue.trim())
                    : `הוסף: "${searchValue.trim()}"`}
                </div>
              ) : (
                <p className="py-6 text-center text-sm">{emptyText}</p>
              )}
            </CommandEmpty>
            <CommandGroup>
              {safeOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  keywords={[option.label, option.value]}
                  onSelect={() => {
                    onValueChange?.(option.value)
                    setOpen(false)
                  }}
                  className="rtl:text-right ltr:text-left"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 rtl:mr-0 rtl:ml-2",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
