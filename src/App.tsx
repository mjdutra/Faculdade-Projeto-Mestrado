import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Homepage from "./pages/Homepage";
import Mapa from "./pages/Mapa";
import Submit from "./pages/Submit";
import Scan from "./pages/Scan";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import TopNav from "@/components/TopNav";
import Grid from "./pages/Grid";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/firebase/AuthContext";



const queryClient = new QueryClient();

const App = () => {
  const { user } = useAuth();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename="/Faculdade-Projeto-Mestrado">
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/grid" element={<Grid />} />
            <Route path="/mapa" element={<Mapa />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/submit" element={user ? <Submit /> : <Navigate to="/login" replace />}/>
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
          <TopNav />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;