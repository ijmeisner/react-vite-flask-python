import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type FlashMessage = {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
};

// Mock flash messages - replace with actual implementation
const mockMessages: FlashMessage[] = [
  // { id: '1', type: 'success', message: 'User created successfully!' },
  // { id: '2', type: 'error', message: 'Failed to delete user.' }
];

export function FlashMessages() {
  const [messages, setMessages] = useState<FlashMessage[]>(mockMessages);

  const removeMessage = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  // Auto-remove messages after 5 seconds
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        setMessages(prev => prev.slice(1));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  if (messages.length === 0) return null;

  const getIcon = (type: FlashMessage['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
    }
  };

  const getVariant = (type: FlashMessage['type']) => {
    switch (type) {
      case 'error':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-2 mb-6 mx-2 sm:mx-0">
      {messages.map((message) => (
        <Alert 
          key={message.id} 
          variant={getVariant(message.type)}
          className={`relative w-full text-sm sm:text-base ${
            message.type === 'success' ? 'border-success bg-success/10 text-success-foreground' :
            message.type === 'warning' ? 'border-warning bg-warning/10 text-warning-foreground' :
            message.type === 'info' ? 'border-primary bg-primary/10 text-primary' : ''
          }`}
        >
          {getIcon(message.type)}
          <AlertDescription className="pr-8">
            {message.message}
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 h-6 w-6 p-0"
            onClick={() => removeMessage(message.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Alert>
      ))}
    </div>
  );
}