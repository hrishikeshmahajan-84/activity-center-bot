import { Shield, Key, MessageSquare, AlertCircle } from "lucide-react";

export function Settings() {
  return (
    <div className="space-y-6 max-w-3xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
        <p className="text-muted-foreground">System configuration and credentials overview.</p>
      </header>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="p-6 border-b border-card-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Burnaby Active Communities</h2>
          </div>
          <p className="text-sm text-muted-foreground ml-13">
            The scraper uses these credentials to log in, read current enrollments, and execute bookings. 
            These are securely loaded via environment variables on the backend.
          </p>
        </div>
        <div className="p-6 bg-muted/10 grid gap-4">
          <div className="flex items-center justify-between p-4 bg-background border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <Key className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Username</span>
            </div>
            <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-emerald-400">Configured via BURNABY_USERNAME</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-background border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <Key className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Password</span>
            </div>
            <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-emerald-400">Configured via BURNABY_PASSWORD</span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="p-6 border-b border-card-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Twilio SMS Notifications</h2>
          </div>
          <p className="text-sm text-muted-foreground ml-13">
            SMS alerts are sent immediately when a booking succeeds or if a fatal error occurs during the window.
          </p>
        </div>
        <div className="p-6 bg-muted/10 grid gap-4">
          <div className="flex items-center justify-between p-4 bg-background border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <Key className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Account SID & Auth Token</span>
            </div>
            <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-emerald-400">Configured in ENV</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-start gap-3 p-4 border border-blue-500/20 bg-blue-500/5 rounded-lg text-blue-400 text-sm">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <p>
          <strong>Security Note:</strong> We do not store credentials in the database. 
          To update your passwords, modify the environment variables directly on the deployment host and restart the service.
        </p>
      </div>
    </div>
  );
}
