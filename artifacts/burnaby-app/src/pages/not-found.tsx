import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="flex-1 w-full flex items-center justify-center py-24">
      <div className="w-full max-w-md mx-4 bg-card border border-card-border rounded-xl p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4 opacity-80" />
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Page Not Found
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          The requested command page could not be located.
        </p>
        <Link href="/" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 hover-elevate">
          <ArrowLeft className="w-4 h-4 mr-2" /> Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
