const CLOUD_NAME = "vvtqaisc";

const UPLOAD_PRESET = "magnet_uploads";

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

    return response.json();

}