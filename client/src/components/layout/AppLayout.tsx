import { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { Navigation } from "./Navigation";
import { Footer } from "./Footer";
import { FlashMessages } from "./FlashMessages";

interface AppLayoutProps {
  children?: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 pt-16">
        <div className="container mx-auto px-4 py-6">
          <FlashMessages />
          {children || <Outlet />}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}