import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/firebase/config";

const UPLOAD_PRESET = "magnet_uploads";
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARYCLOUDNAME;

const functions = getFunctions(app);
const deleteCloudinaryAssetFn = httpsCallable(functions, "deleteCloudinaryAsset");

const DELETE_ASSET_URL = "https://us-central1-magnetstorage-8d096.cloudfunctions.net/deleteCloudinaryAsset";

export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error("Falha no upload para o Cloudinary");
  }

  return response.json();
}

export async function deleteAsset(publicId: string, resourceType: string): Promise<void> {
  const response = await fetch(DELETE_ASSET_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId, resourceType }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? `Failed to delete asset (${response.status})`);
  }
}