import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { deleteAsset } from "@/services/cloudinary";
import type { Magnet } from "@/types/magnet";

export interface DeleteMagnetResult {
  assetsFullyRemoved: boolean;
}

export async function deleteMagnet(magnet: Magnet): Promise<DeleteMagnetResult> {
  const deletions: Promise<unknown>[] = [];

  if (magnet.videoPublicId) {
    deletions.push(deleteAsset(magnet.videoPublicId, magnet.videoResourceType ?? "video"));
  }
  if (magnet.modelPublicId) {
    deletions.push(deleteAsset(magnet.modelPublicId, magnet.modelResourceType ?? "raw"));
  }

  const results = await Promise.allSettled(deletions);
  const assetsFullyRemoved = results.every((r) => r.status === "fulfilled");

  if (!assetsFullyRemoved) {
    console.error(
      // "Alguns ficheiros associados não foram eliminados do Cloudinary:",
      results.filter((r) => r.status === "rejected")
    );
  }

  await deleteDoc(doc(db, "magnets", magnet.id));

  return { assetsFullyRemoved };
}