import { Link, useLocation } from "wouter";
import { Activity, Target, CalendarDays, Settings, Waves } from "lucide-react";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: Activity },
    { href: "/targets", label: "Targets", icon: Target },
    { href: "/bookings", label: "Bookings", icon: CalendarDays },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground selection:bg-primary/30">
      <nav className="w-64 border-r border-border bg-card flex flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Waves className="w-5 h-5 text-primary mr-3" />
          <h1 className="font-semibold text-lg tracking-tight">Burnaby Ops</h1>
        </div>
        <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <Icon className={cn("w-4 h-4 mr-3", isActive ? "text-primary" : "text-muted-foreground")} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>
        <div className="p-4 border-t border-border">
          <div className="bg-muted/50 rounded-md p-3">
            <div className="text-xs text-muted-foreground mb-1">System Status</div>
            <div className="flex items-center text-xs font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
              Online
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile nav - simple bottom bar for small screens */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-50">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div className="flex flex-col items-center justify-center p-2 cursor-pointer">
                <Icon className={cn("w-5 h-5 mb-1", isActive ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-[10px]", isActive ? "text-primary font-medium" : "text-muted-foreground")}>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Decorative noise/gradient behind content */}
        <div className="absolute inset-0 pointer-events-none z-0">
           <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] mix-blend-screen" />
        </div>
        
        <div className="flex-1 overflow-y-auto z-10 pb-16 md:pb-0">
          <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
