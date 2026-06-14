"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ children, ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props}>{children}</PopoverPrimitive.Trigger>;
}

function PopoverContent({
  className,
  children,
  ...props
}: PopoverPrimitive.Popup.Props) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        data-slot="popover-positioner"
        className="fixed inset-0 z-50"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "z-50 w-80 max-h-96 rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            className
          )}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
}