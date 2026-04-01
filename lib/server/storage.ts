import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { hasS3Storage, getEnv } from "./env";

const GENERATED_DIR = path.join(process.cwd(), "public", "generated");

function getS3Client() {
  if (!hasS3Storage()) {
    return null;
  }

  const env = getEnv();
  return new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: Boolean(env.S3_ENDPOINT),
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    },
  });
}

function sanitizeFileSegment(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9-_]+/g, "-");
}

async function persistLocally(projectId: string, filename: string, bytes: Uint8Array) {
  const directory = path.join(GENERATED_DIR, sanitizeFileSegment(projectId));
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), bytes);
  return `/generated/${sanitizeFileSegment(projectId)}/${filename}`;
}

export async function saveImageAsset(args: {
  projectId: string;
  screenKey: string;
  bytes: Uint8Array;
  contentType: string;
}) {
  const filename = `${sanitizeFileSegment(args.screenKey)}-${randomUUID()}.png`;
  const s3 = getS3Client();

  if (!s3) {
    const url = await persistLocally(args.projectId, filename, args.bytes);
    return {
      imageAssetKey: `${args.projectId}/${filename}`,
      imageUrl: url,
    };
  }

  const env = getEnv();
  const key = `projects/${sanitizeFileSegment(args.projectId)}/${filename}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: args.bytes,
      ContentType: args.contentType,
    }),
  );

  const baseUrl = env.S3_ENDPOINT
    ? `${env.S3_ENDPOINT.replace(/\/$/, "")}/${env.S3_BUCKET}`
    : `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com`;

  return {
    imageAssetKey: key,
    imageUrl: `${baseUrl}/${key}`,
  };
}

export async function fetchAndCacheRemoteImage(args: {
  projectId: string;
  screenKey: string;
  remoteUrl: string;
}) {
  const response = await fetch(args.remoteUrl);
  if (!response.ok) {
    throw new Error(`Image fetch failed with status ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return saveImageAsset({
    projectId: args.projectId,
    screenKey: args.screenKey,
    bytes: new Uint8Array(arrayBuffer),
    contentType: response.headers.get("content-type") ?? "image/png",
  });
}

export async function saveUploadedFile(args: {
  projectId: string;
  screenKey: string;
  file: File;
}) {
  const arrayBuffer = await args.file.arrayBuffer();
  return saveImageAsset({
    projectId: args.projectId,
    screenKey: args.screenKey,
    bytes: new Uint8Array(arrayBuffer),
    contentType: args.file.type || "image/png",
  });
}
