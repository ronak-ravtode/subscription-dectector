import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shield, Upload, History, Settings, LogOut, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { name: "Upload", path: "/upload", icon: Upload },
    { name: "Subscriptions", path: "/subscriptions", icon: CreditCard },
    { name: "History", path: "/history", icon: History },
  ];

  return (
    <header className="sticky top-6 z-50 w-full px-4 md:px-8 flex justify-center">
      <div className="flex h-[60px] w-full max-w-[1440px] items-center justify-between rounded-[20px] border border-border/80 bg-background/80 px-6 shadow-sm backdrop-blur-xl transition-all duration-300">
        <div className="flex items-center space-x-10">
          <Link to="/" className="flex items-center space-x-2.5 transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <div className="bg-primary p-1.5 rounded-lg shadow-sm">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden font-bold text-foreground sm:inline-block text-[19px] tracking-tight">
              SubGuard
            </span>
          </Link>
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    "flex items-center space-x-2 rounded-xl px-3.5 py-2 transition-all duration-200",
                    isActive
                      ? "text-foreground font-semibold bg-secondary/80 shadow-sm"
                      : "text-muted-foreground font-medium hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <Icon className={cn("h-[18px] w-[18px]", isActive ? "text-accent" : "text-muted-foreground")} />
                  <span className="text-[14px]">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center space-x-3">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 transition-all shadow-sm">
                <span className="font-semibold text-[14px]">{user?.email?.[0].toUpperCase() || "U"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 rounded-xl border-border bg-popover shadow-md p-2" align="end" forceMount>
              <DropdownMenuLabel className="font-normal px-2 py-1.5">
                <div className="flex flex-col space-y-1">
                  <p className="text-[14px] font-medium leading-none text-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border my-1" />
              <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer rounded-lg focus:bg-secondary focus:text-foreground py-2 text-muted-foreground">
                <Settings className="mr-2 h-4 w-4" />
                <span className="text-[14px] font-medium">Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer rounded-lg focus:bg-destructive/10 focus:text-destructive py-2 mt-1 group text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span className="text-[14px] font-medium">Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}