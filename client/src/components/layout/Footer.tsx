export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-secondary border-t border-border">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center text-sm text-muted-foreground">
          &copy; {currentYear} Syniti Template. All rights reserved.
        </div>
      </div>
    </footer>
  );
}