/**
 * Import function triggers from their respective submodules:
 *
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// import {setGlobalOptions} from "firebase-functions";
// import {onRequest} from "firebase-functions/https";
// import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
// setGlobalOptions({ maxInstances: 10 });

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });


import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { v2 as cloudinary } from "cloudinary";

const cloudName = defineSecret("CLOUDINARY_CLOUD_NAME");
const apiKey = defineSecret("CLOUDINARY_API_KEY");
const apiSecret = defineSecret("CLOUDINARY_API_SECRET");

export const deleteCloudinaryAsset = onCall(
  { secrets: [cloudName, apiKey, apiSecret] },
  async (request) => {
    const { publicId, resourceType } = request.data as {
      publicId?: string;
      resourceType?: string;
    };

    if (!publicId) {
      throw new HttpsError("invalid-argument", "publicId em falta");
    }

    cloudinary.config({
      cloud_name: cloudName.value(),
      api_key: apiKey.value(),
      api_secret: apiSecret.value(),
    });

    try {
      return await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType ?? "image",
        invalidate: true,
      });
    } catch (error) {
      console.error("Erro ao eliminar no Cloudinary:", error);
      throw new HttpsError("internal", "Falha ao eliminar ficheiro");
    }
  }
);