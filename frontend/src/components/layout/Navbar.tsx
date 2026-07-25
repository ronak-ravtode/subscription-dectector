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
import { Shield, Upload, History, Settings, LogOut, User, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <header className="sticky top-4 z-50 w-full px-4 md:px-8 flex justify-center">
      <div className="flex h-16 w-full max-w-[1440px] items-center justify-between rounded-2xl border border-slate-200/60 bg-white/80 px-6 shadow-sm backdrop-blur-md">
        <div className="flex items-center space-x-8">
          <Link to="/" className="flex items-center space-x-2 transition-transform hover:scale-105 active:scale-95">
            <Shield className="h-6 w-6 text-primary" />
            <span className="hidden font-bold text-primary sm:inline-block text-lg tracking-tight">
              SubGuard
            </span>
          </Link>
          <nav className="hidden md:flex items-center space-x-2 text-sm font-medium">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    "flex items-center space-x-2 rounded-lg px-3 py-2 transition-all hover:bg-slate-100/50 hover:text-primary",
                    isActive
                      ? "text-primary font-semibold bg-slate-100/50"
                      : "text-slate-500 font-medium"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-slate-400")} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-transform hover:scale-105">
                <span className="font-semibold">{user?.email?.[0].toUpperCase() || "U"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 rounded-xl border-slate-200 shadow-lg" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer rounded-md focus:bg-slate-100">
                <Settings className="mr-2 h-4 w-4 text-slate-500" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-danger focus:bg-danger/10 focus:text-danger rounded-md">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}