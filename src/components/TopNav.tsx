import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/firebase/AuthContext";

const leftItem = { path: "/", label: "Explore" };
const centerItem = { path: "/scan", label: "Scan" };

export default function TopNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const rightItems = user
  ? [
      { path: "/submit", label: "New" },
      { path: "/profile", label: "Perfil" },
    ]
  : [ { path: "/login", label: "Login" }];

  
  const linkClass = (path: string) =>
    cn(
      "text-xs md:text-sm font-bold tracking-widest uppercase transition-opacity"
    );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white-10">
      <div className="grid grid-cols-3 items-center px-6 md:px-10 h-16 mx-auto text-black">
        <div className="justify-self-start">
          <Link to={leftItem.path} className={linkClass(leftItem.path)}>
            {leftItem.label}
          </Link>
        </div>

        <div className="justify-self-center">
          <Link to={centerItem.path} className={linkClass(centerItem.path)}>
            {centerItem.label}
          </Link>
        </div>

        <div className="flex gap-6 justify-self-end">
          {rightItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={linkClass(item.path)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}