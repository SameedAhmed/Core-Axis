"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps {
    className?: string
    date?: {
        from: Date | undefined
        to?: Date | undefined
    }
    setDate: (date: { from: Date | undefined; to?: Date | undefined } | undefined) => void
}

export function DatePickerWithRange({
    className,
    date,
    setDate,
}: DatePickerWithRangeProps) {

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-full sm:w-[260px] justify-start text-left font-normal bg-muted border-border hover:bg-background h-10 rounded-lg",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y")} -{" "}
                                    {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Date range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-border bg-card shadow-lg" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={{ from: date?.from, to: date?.to }}
                        onSelect={setDate as any}
                        numberOfMonths={1}
                    />
                </PopoverContent>
            </Popover>
            {date?.from && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDate(undefined)}
                    className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-transparent"
                    title="Clear date filter"
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    )
}
