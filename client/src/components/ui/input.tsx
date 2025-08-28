import React, { forwardRef, useState } from "react"
import { cn } from "@/lib/utils"
import { AlertCircle } from "lucide-react"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  showValidation?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, showValidation = true, onBlur, onInvalid, ...props }, ref) => {
    const [validationError, setValidationError] = useState<string>("")
    const [touched, setTouched] = useState(false)

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setTouched(true)
      
      // Custom validation
      const input = e.target
      if (props.required && !input.value.trim()) {
        setValidationError("This field is required")
      } else if (input.type === "email" && input.value && !input.validity.valid) {
        setValidationError("Please enter a valid email address")
      } else {
        setValidationError("")
      }
      
      onBlur?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Clear validation error when user starts typing
      if (validationError && e.target.value) {
        setValidationError("")
      }
      props.onChange?.(e)
    }

    const handleInvalid = (e: React.InvalidEvent<HTMLInputElement>) => {
      e.preventDefault() // Prevent default browser validation popup
      setTouched(true)
      
      const input = e.target
      if (input.validity.valueMissing) {
        setValidationError("This field is required")
      } else if (input.validity.typeMismatch) {
        setValidationError("Please enter a valid email address")
      } else {
        setValidationError("Please enter a valid value")
      }
      
      onInvalid?.(e)
    }

    const displayError = error || (touched && validationError)
    const hasError = Boolean(displayError)

    return (
      <div className="space-y-1">
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-colors",
            hasError && "border-red-500 focus-visible:ring-red-500 bg-red-50/50",
            className
          )}
          ref={ref}
          onBlur={handleBlur}
          onChange={handleChange}
          onInvalid={handleInvalid}
          {...props}
        />
        
        {/* Custom validation message */}
        {showValidation && displayError && (
          <div className="flex items-center gap-2 text-sm text-red-600 animate-fade-in bg-red-50 border border-red-200 rounded-md p-3 shadow-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
            <span className="font-medium">{displayError}</span>
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }