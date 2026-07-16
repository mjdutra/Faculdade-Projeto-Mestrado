import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Homepage from "./pages/Homepage";
// import MagnetPage from "./pages/MagnetPage";
import Mapa from "./pages/Mapa";
import Submit from "./pages/Submit";
import Scan from "./pages/Scan";
import VRExperience from "./pages/VRExperience";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import TopNav from "@/components/TopNav";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/mapa" element={<Mapa />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/submit" element={<Submit />} />
          <Route path="/vr/:magnetId" element={<VRExperience />} />
          <Route path="/profile" element={<Profile />} />
          {/* <Route path="/magnet" element={<MagnetPage />} /> */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <TopNav />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;