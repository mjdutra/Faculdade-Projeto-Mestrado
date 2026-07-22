import { GeoPoint, Timestamp } from "firebase/firestore";
import { PointOfInterest } from "@/components/poi/PointOfInterest";

export interface Magnet {
  id: string;
  titulo: string;
  localização: string;
  descrição: string;
  modelURL: string;
  videoURL: string;
  coordenadas?: GeoPoint; // Opcional para jáaaa
  data?: Timestamp;
  points: PointOfInterest[];
}