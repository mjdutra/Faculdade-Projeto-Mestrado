import { PointOfInterest, POIMedia } from "./PointOfInterest";
import { ReactElement } from "react";

type MediaRenderer = (media: POIMedia, key: string) => ReactElement;

const MEDIA_RENDERERS: Record<POIMedia["type"], MediaRenderer> = {
  image: (media, key) => (
    <img key={key} src={media.url} alt={media.caption ?? ""} className="w-full h-auto mt-2 border border-black" />
  ),
  audio: (media, key) => <audio key={key} src={media.url} controls className="w-full mt-2" />,
  video: (media, key) => <video key={key} src={media.url} controls className="w-full mt-2" />,
};

interface HotspotTooltipProps {
  point: PointOfInterest;
}

export function HotspotTooltip({ point }: HotspotTooltipProps) {
  return (
    <div className="w-56 p-3 bg-white border border-black shadow-lg text-sm text-black">
      <p className="font-black uppercase text-xs tracking-widest">
        {point.title || "Sem título"}
      </p>
      {point.description && <p className="mt-1 text-gray-600">{point.description}</p>}
      {point.media?.map((media, i) => MEDIA_RENDERERS[media.type]?.(media, `${point.id}-media-${i}`))}
    </div>
  );
}