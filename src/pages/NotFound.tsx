import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";


const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center max-w-md">
        <h1 className="text-[5rem] md:text-[7rem] lg:text-[9rem] font-black mb-4 text-gray-900">404</h1>
        <p className="text-xl text-gray-600">
          Oops! Página não encontrada
        </p>
        <p className="text-gray-500 mb-8">
          A página que procura não existe ou foi movida.
        </p>
        <Button className="rounded-none uppercase text-xs font-bold tracking-widest bg-black text-white hover:bg-neutral-800">
            Voltar ao Início
        </Button>
      </div>
    </div>
  );
};

export default NotFound;