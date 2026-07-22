import { useEffect, useRef, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Magnet } from "@/types/magnet";
import Video360Viewer, { Video360ViewerHandle } from "@/components/video/Video360Viewer";
import VideoControls from "@/components/video/VideoControls";



interface Props {
  magnet: Magnet | null;
  onClose: () => void;
}

export default function MagnetPage({ magnet, onClose }: Props) {
  const viewerRef = useRef<Video360ViewerHandle>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [magnet?.id]);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(document.fullscreenElement === playerContainerRef.current);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    const el = playerContainerRef.current;
    if (!el) return;
    document.fullscreenElement ? document.exitFullscreen().catch(() => {}) : el.requestFullscreen().catch(() => {});
  };

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 transition-opacity duration-300 z-40 ${
          magnet ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        className={`fixed top-0 right-0 h-screen w-full border-l border-black md:w-[45vw] bg-white z-[99999] transition-transform duration-500 ${
          magnet ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {magnet && (
          <div className="flex flex-col h-full" key={magnet.id}>
            <div className="flex justify-between items-center p-2 border-b border-black py-5">
              <h2 className="text-sm font-black uppercase">about</h2>
              <button onClick={onClose}>
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 py-10">
              {magnet.videoURL && (
                <div ref={playerContainerRef} className="relative w-full aspect-video bg-black border border-black mb-8">
                  <Video360Viewer
                    ref={viewerRef}
                    videoUrl={magnet.videoURL}
                    points={magnet.points ?? []}
                    isAddingPOI={false}
                    onTimeUpdate={setCurrentTime}
                    onDurationChange={setDuration}
                    onPlayingChange={setIsPlaying}
                    onVolumeChange={(v, m) => {
                      setVolume(v);
                      setIsMuted(m);
                    }}
                  />
                  <VideoControls
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    volume={volume}
                    isMuted={isMuted}
                    isFullscreen={isFullscreen}
                    onPlayPause={() => viewerRef.current?.togglePlay()}
                    onSeek={(time) => viewerRef.current?.seek(time)}
                    onVolumeChange={(value) => viewerRef.current?.setVolume(value)}
                    onToggleMute={() => viewerRef.current?.toggleMute()}
                    onToggleFullscreen={toggleFullscreen}
                  />
                </div>
              )}

              <h2 className="text-3xl font-black uppercase mb-8">{magnet.titulo}</h2>

              <p className="text-sm text-gray-500">Localização</p>
              <p className="mb-6">{magnet.localização}</p>

              <p className="text-sm text-gray-500">Descrição</p>
              <p className="mb-8">{magnet.descrição}</p>

              <div className="flex flex-col lg:flex-row gap-4">
                <Button
                  type="button"
                  className="w-full lg:flex-1 rounded-none uppercase text-xs font-bold tracking-widest bg-neutral-700 text-white hover:bg-neutral-800"
                >
                  Enter in VR Experience
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full lg:flex-1 rounded-none border-black uppercase text-xs font-bold tracking-widest text-black hover:text-white hover:bg-neutral-800"
                >
                  Print Magnet
                </Button>
              </div>
            </div>

            <div className="p-8 flex justify-end">
              <button className="flex items-center gap-2 text-red-600 hover:text-red-800">
                <Trash2 size={20} />
                Delete
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}