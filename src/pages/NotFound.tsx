import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
        <div className="text-8xl mb-6">🔍</div>
        <h1 className="text-6xl font-bold mb-4 text-gray-900">404</h1>
        <p className="text-xl text-gray-600 mb-8">
          Oops! Página não encontrada
        </p>
        <p className="text-gray-500 mb-8">
          A página que procura não existe ou foi movida.
        </p>
        <Button onClick={() => window.location.href = '/'} className="bg-blue-600 hover:bg-blue-700">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Início
        </Button>
      </div>
    </div>
  );
};

export default NotFound;