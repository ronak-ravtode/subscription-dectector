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
import { Shield, Upload, History, Settings, LogOut, User, LayoutDashboard, CreditCard, Mail } from "lucide-react";
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
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/upload", icon: Upload, label: "Upload" },
    { to: "/subscriptions", icon: CreditCard, label: "Subscriptions" },
    { to: "/history", icon: History, label: "History" },
    { to: "/email", icon: Mail, label: "Email" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-canvas border-b border-hairline">
      <div className="container flex h-16 items-center">
        <Link to="/" className="mr-8 flex items-center space-x-2 group">
          <Shield className="h-6 w-6 text-ink" />
          <span className="hidden font-bold text-lg sm:inline-block font-heading">
            SubGuard
          </span>
        </Link>

        <nav className="flex items-center space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center space-x-1.5 text-sm font-medium transition-colors duration-150",
                isActive(item.to)
                  ? "text-ink border-b-2 border-ink pb-0.5"
                  : "text-mute hover:text-ink"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="hidden md:inline-block">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-sale focus:text-sale">
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
