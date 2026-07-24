const cloudinary = {
 cloudname: import.meta.env.VITE_CLOUDINARYCLOUDNAME,
 apikey: import.meta.env.VITE_CLOUDINARYAPIKEY,
 apisecret: import.meta.env.VITE_CLOUDINARYAPISECRET
}

const UPLOAD_PRESET = "magnet_uploads";

export async function uploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    const response = await fetch(

        `https://api.cloudinary.com/v1_1/${cloudinary.cloudname}/auto/upload`,

        {
            method: "POST",
            body: formData,
        }

    );

    return response.json();

}

export async function deleteAsset(publicId: string, resourceType: string = "image") {
  const res = await fetch("/api/cloudinary/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId, resourceType }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao eliminar ${publicId} do Cloudinary`);
  }

  return res.json();
}