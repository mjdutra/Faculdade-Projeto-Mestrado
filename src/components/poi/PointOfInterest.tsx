export interface POIMedia {
  type: "image" | "audio" | "video";
  url: string;
  caption?: string;
}


export interface PointOfInterest {
    id: string;
    title: string;
    description: string; 
    duration: number;
    
    timestamp: number;
    yaw: number;
    pitch: number;
    media?: POIMedia;
  }