import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/firebase/AuthContext";

const leftItem = { path: "/", label: "Explorar" };
const centerItem = { path: "/scan", label: "Scan" };

export default function TopNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const rightItems = user
    ? [
        { path: "/submit", label: "Novo" },
        { path: "/profile", label: "Perfil" },
      ]
    : [{ path: "/login", label: "Login" }];

  const linkClass = (path: string) =>
    cn(
      "text-xs md:text-sm font-bold tracking-widest uppercase transition-opacity"
    );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white-10">
      <div className="flex md:grid md:grid-cols-3 items-center justify-between px-6 md:px-10 h-16 mx-auto text-black">
        {/* Explorar */}
        <div className="flex-1 md:flex-none md:justify-self-start">
          <Link to={leftItem.path} className={linkClass(leftItem.path)}>
            {leftItem.label}
          </Link>
        </div>

        {/* Scan */}
        <div className="flex-1 flex justify-center md:justify-self-center">
          <Link to={centerItem.path} className={linkClass(centerItem.path)}>
            {centerItem.label}
          </Link>
        </div>

        {/* Novo + Perfil */}
        <div className="flex-1 flex justify-end gap-2 md:gap-6 md:justify-self-end">
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

