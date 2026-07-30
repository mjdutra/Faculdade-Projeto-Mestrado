import { GeoPoint, Timestamp } from "firebase/firestore";
import { PointOfInterest } from "@/components/poi/PointOfInterest";

export interface QRPlacement {
  position: [number, number, number];
  normal: [number, number, number];
  scale: number;
  mode?: "emboss" | "deboss";
  reliefHeight?: number;
  flipNormal?: boolean;
}

export interface Magnet {
  id: string;
  titulo: string;
  localização: string;
  descrição: string;
  modelURL: string;
  videoURL: string;
  videoPublicId?: string;
  videoResourceType?: string;
  modelPublicId?: string;
  modelResourceType?: string;
  coordenadas?: GeoPoint;
  points: PointOfInterest[];
  qrPlacement?: QRPlacement;
  ownerId?: string;
  ownerEmail?: string | null;
  createdAt?: Timestamp;
}