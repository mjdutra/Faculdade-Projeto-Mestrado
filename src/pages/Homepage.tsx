import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Map } from "lucide-react";
import { MagnetViewer } from "@/components/magnet/MagnetViewer";
import { useMemo } from "react";


const MAGNET_SIZE = 300; 
const PADDING = 16;     

const Homepage = () => {
  const magnets = [
    {
      id: '1',
      name: 'Urso',
      location: 'Coimbra',
      duration: 5,
      model3d: '/models/urso.glb',
      qrCode: 'QR001',
      description: 'Experiência 360º do Parque Verde'
    },
  ];

  const magnetsWithPosition = useMemo(
    () =>
      magnets.map((magnet) => ({
        ...magnet,
        x: Math.random(),
        y: Math.random(),
      })),
    []
  );

  return (
    <div className="absolute top-0 left-0 right-0 z-10">

      <style>{`
        @keyframes drift {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        .y2k-bg { animation: drift 10s ease-in-out infinite; }

        .grain::before {
          content: '';
          position: fixed;
          inset: -50%;
          width: 200%;
          height: 200%;
          z-index: -9;
          pointer-events: none;
          opacity: 0.35;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 256px 256px;
        }
      `}</style>

      <div
        className="fixed inset-0 -z-10 y2k-bg"
        style={{
          background: `
            radial-gradient(ellipse at 15% 60%, #bfdbfe 0%, transparent 55%),
            radial-gradient(ellipse at 85% 15%, #ffffff 0%, transparent 45%),
            radial-gradient(ellipse at 70% 85%, #93c5fd 0%, transparent 45%),
            radial-gradient(ellipse at 40% 20%, #dbeafe 0%, transparent 50%),
            linear-gradient(135deg, #1d4ed8 0%, #3b82f6 40%, #eff6ff 100%)
          `,
        }}
      />

      {/* Grain texture */}
      <div className="grain fixed inset-0 -z-10 pointer-events-none" />

      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-xl font-bold text-white drop-shadow">Logo</h1>
          <Button asChild variant="outline" size="sm" className="ml-auto bg-white/20 border-white/40 text-white hover:bg-white/30 backdrop-blur-sm">
            <Link to="/mapa">
              <Map className="w-4 h-4 mr-1" />
              Mapa
            </Link>
          </Button>
        </div>
      </div>

      <div className="relative w-full h-screen overflow-hidden">
        {magnetsWithPosition.map((magnet) => (
          
          <Card
            key={magnet.id}
            className="absolute bg-transparent shadow-none border-0"
            style={{
              left: `calc(${PADDING}px + ${magnet.x} * (100% - ${MAGNET_SIZE + PADDING * 2}px))`,
              top: `calc(${PADDING}px + ${magnet.y} * (100% - ${MAGNET_SIZE + PADDING * 2}px))`,
            }}
          >
          <div className="w-[300px] h-[300px]">
            <MagnetViewer modelUrl={magnet.model3d} />
          </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Homepage;