import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { v2 as cloudinary } from "cloudinary";

const cloudinaryApiKey = defineSecret("CLOUDINARY_API_KEY");
const cloudinaryApiSecret = defineSecret("CLOUDINARY_API_SECRET");

export const deleteCloudinaryAsset = onRequest(
  {
    secrets: [cloudinaryApiKey, cloudinaryApiSecret],
    cors: true,
  },
  
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { publicId, resourceType } = req.body ?? {};
    if (!publicId) {
      res.status(400).json({ error: "Missing publicId" });
      return;
    }

    try {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUDNAME,
        api_key: cloudinaryApiKey.value(),
        api_secret: cloudinaryApiSecret.value(),
      });
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType ?? "raw",
      });
      res.status(200).json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete asset" });
    }
  }
);