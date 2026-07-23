import { GeoPoint, Timestamp } from "firebase/firestore";
import { PointOfInterest } from "@/components/poi/PointOfInterest";

export interface QRPlacement {
  position: [number, number, number]; 
  normal: [number, number, number];
  scale: number; 
}

export interface Magnet {
  id: string;
  titulo: string;
  localização: string;
  descrição: string;
  modelURL: string;
  videoURL: string;
  coordenadas?: GeoPoint;
  data?: Timestamp;
  points: PointOfInterest[];
  qrPlacement?: QRPlacement;
}