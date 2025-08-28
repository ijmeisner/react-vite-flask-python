import { useToast } from "@/hooks/use-toast"
import { useEffect, useState } from "react"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <ToastWithTimer key={id} id={id} title={title} description={description} action={action} {...props} />
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

function ToastWithTimer({ id, title, description, action, ...props }: any) {
  const [progress, setProgress] = useState(100)
  const [isVisible, setIsVisible] = useState(false)
  const { dismiss } = useToast()

  useEffect(() => {
    // Modern entrance animation
    const entranceTimer = setTimeout(() => setIsVisible(true), 50)
    
    const duration = 3000 // 3 seconds
    
    // Start progress bar animation immediately after component mounts
    const progressTimer = setTimeout(() => {
      setProgress(0) // This will trigger the CSS transition from 100% to 0%
    }, 100) // Small delay to ensure component is mounted
    
    // Auto-dismiss when timer runs out (synchronized with progress bar)
    const dismissTimer = setTimeout(() => {
      dismiss(id)
    }, duration)
    
    return () => {
      clearTimeout(entranceTimer)
      clearTimeout(progressTimer)
      clearTimeout(dismissTimer)
    }
  }, [id, dismiss])

  return (
    <Toast 
      {...props} 
      className={`
        relative overflow-hidden border border-border bg-background text-foreground shadow-lg
        transition-all duration-300 ease-out transform
        ${isVisible 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
        }
        hover:scale-[1.02] hover:shadow-xl
        data-[swipe=cancel]:translate-x-0
        data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]
        data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]
        data-[swipe=move]:transition-none
        data-[state=open]:animate-in
        data-[state=open]:slide-in-from-right
        data-[state=open]:fade-in
        data-[state=closed]:animate-out
        data-[state=closed]:fade-out
        data-[state=closed]:slide-out-to-right
      `}
    >
      <div className="grid gap-1 p-4">
        {title && <ToastTitle>{title}</ToastTitle>}
        {description && (
          <ToastDescription>{description}</ToastDescription>
        )}
      </div>
      {action}
      <ToastClose />
      
      {/* Purple Timer Bar - smooth linear animation */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
        <div 
          className="h-full transition-all ease-linear"
          style={{ 
            width: `${progress}%`,
            background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary-hover)) 100%)',
            transitionDuration: progress === 100 ? '0ms' : '2900ms' // No transition on initial load, then smooth 2.9s animation
          }}
        />
      </div>
    </Toast>
  )
}