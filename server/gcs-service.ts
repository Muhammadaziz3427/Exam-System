import { Storage } from "@google-cloud/storage";
import path from "path";

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME || "";

export async function uploadToGCS(filePath: string, destination: string): Promise<string> {
  if (!bucketName) {
    throw new Error("GCS_BUCKET_NAME environment variable is not set");
  }

  const bucket = storage.bucket(bucketName);
  const options = {
    destination: destination,
    public: true,
  };

  await bucket.upload(filePath, options);
  
  // Public URL format: https://storage.googleapis.com/[BUCKET_NAME]/[FILE_NAME]
  return `https://storage.googleapis.com/${bucketName}/${destination}`;
}
