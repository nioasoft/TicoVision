import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, style, dir = "rtl", ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null)
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

    React.useLayoutEffect(() => {
      if (inputRef.current && dir === "ltr" && type === "date") {
        // Only set text-align if not explicitly provided in style prop
        if (!style?.textAlign) {
          inputRef.current.style.setProperty('text-align', 'right', 'important')
        }
      }
    }, [dir, type, style])

    return (
      <input
        type={type}
        dir={dir}
        className={cn(
          "flex h-11 w-full rounded-md border border-gray-700 bg-[hsl(50,100%,80%)] px-3 py-2 text-[17px] shadow-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(45,95%,50%)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          dir === "ltr" && "text-right",
          className
        )}
        style={{
          ...style,
          textAlign: style?.textAlign || ((dir === "ltr" && type === "date") ? 'right' : 'right'),
        } as React.CSSProperties}
        ref={inputRef}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
