import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/",         emoji: "🏠", label: "Home",       color: "bg-blue-100 text-blue-700 border-blue-200" },
  { href: "/targets",  emoji: "🎯", label: "Activities",  color: "bg-orange-100 text-orange-700 border-orange-200" },
  { href: "/bookings", emoji: "📋", label: "History",     color: "bg-purple-100 text-purple-700 border-purple-200" },
  { href: "/settings", emoji: "⚙️", label: "Settings",    color: "bg-green-100 text-green-700 border-green-200" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground selection:bg-primary/20">
      {/* ── Desktop Sidebar ── */}
      <nav className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col hidden md:flex shrink-0">
        {/* Logo */}
        <div className="h-20 flex items-center px-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-2xl shadow-md">
              🏅
            </div>
            <div>
              <h1 className="font-extrabold text-lg leading-tight text-foreground">Activity HQ</h1>
              <p className="text-[11px] text-muted-foreground font-medium">Burnaby Fun Finder</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <div className="flex-1 py-5 px-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center px-3 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer gap-3 border",
                    isActive
                      ? `${item.color} shadow-sm scale-[1.02]`
                      : "text-muted-foreground border-transparent hover:bg-muted/60 hover:text-foreground"
                  )}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <span className="text-xl w-7 text-center">{item.emoji}</span>
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Status footer */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2.5">
            <span className="text-lg">🤖</span>
            <div>
              <div className="text-xs font-bold text-emerald-700">Robot is Watching!</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-emerald-600 font-medium">All systems go</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Mobile Bottom Nav ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-border flex items-center justify-around z-50 px-2 shadow-lg">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div className="flex flex-col items-center justify-center p-1.5 cursor-pointer">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all",
                  isActive ? `${item.color} shadow-sm border` : ""
                )}>
                  {item.emoji}
                </div>
                <span className={cn(
                  "text-[10px] mt-0.5 font-bold",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Decorative bubbles */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary/6 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-purple-400/6 rounded-full blur-3xl" />
        </div>

        <div className="flex-1 overflow-y-auto z-10 pb-16 md:pb-0">
          <div className="p-5 md:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
