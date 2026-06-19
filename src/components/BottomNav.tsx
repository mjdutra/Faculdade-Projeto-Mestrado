import { useLocation } from 'react-router-dom';
import { MapPin, ScanLine, PlusCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: MapPin, label: 'Explore' },
  { path: '/scan', icon: ScanLine, label: 'Scan' },
  { path: '/submit', icon: PlusCircle, label: 'New' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(10px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(10px) saturate(1.6)',
        boxShadow: '0 -1px 0 rgba(255,255,255,0.6) inset, 0 -8px 32px rgba(59,130,246,0.12)',
      }}
    >
      
      <div className="flex justify-around items-center h-16 max-w-2xl mx-auto">
        {navItems.map((item) => (
          <a 
            key={item.path} 
            href={item.path} 
            className={cn(
              'flex flex-col items-center justify-center w-full h-full transition-colors',
              pathname === item.path ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-xs mt-1">{item.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}