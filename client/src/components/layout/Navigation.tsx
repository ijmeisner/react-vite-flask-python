import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Shield, FileText, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

export function Navigation() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: 'Success', description: 'Logged out successfully' });
      navigate('/login');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to logout',
        variant: 'destructive',
      });
    }
  };

  return (
    <nav className="bg-gradient-primary text-white h-16 shadow-strong fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between w-full px-6 h-full">
        <div className="flex items-center space-x-4">
          {user && (
            <span className="text-sm font-medium text-white">{user.email}</span>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="default" asChild className="text-white hover:bg-white/10 hover:text-white px-4 py-2">
            <Link to="/" aria-label="Navigate to home page" title="Home" className="flex items-center justify-center">
              <Home className="h-6 w-6" />
            </Link>
          </Button>
          {user?.role === 'Admin' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="default" className="text-white hover:bg-white/10 hover:text-white flex items-center px-4 py-2" aria-label="Admin menu" title="Admin">
                  <Shield className="h-6 w-6 mr-2" />
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-primary text-white border-primary-hover z-[100]">
                <DropdownMenuItem asChild>
                  <Link to="/admin" className="cursor-pointer">
                    <Shield className="h-4 w-4 mr-2" />
                    Security
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/logs" className="cursor-pointer">
                    <FileText className="h-4 w-4 mr-2" />
                    Log Viewer
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {user && (
            <Button variant="ghost" size="default" onClick={handleLogout} className="text-white hover:bg-white/10 hover:text-white px-4 py-2" aria-label="Logout" title="Logout">
              <LogOut className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
