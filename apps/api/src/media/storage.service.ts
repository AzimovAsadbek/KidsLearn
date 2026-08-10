import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import type { StorageConfig } from "../common/config/configuration";

/**
 * S3-compatible object storage. MinIO locally, any S3 provider in production —
 * the only difference is configuration, never code.
 *
 * Binaries never touch PostgreSQL; the database stores the object key and the
 * public URL is derived from it.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly config: StorageConfig;

  constructor(config: ConfigService) {
    this.config = config.getOrThrow<StorageConfig>("storage");
    this.client = new S3Client({
      endpoint: this.config.endpoint,
      region: this.config.region,
      forcePathStyle: this.config.forcePathStyle,
      credentials: {
        accessKeyId: this.config.accessKey,
        secretAccessKey: this.config.secretKey,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    // Create the bucket on first boot so a fresh developer machine works
    // without a manual MinIO step.
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.config.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.config.bucket }));
        this.logger.log(`Created object storage bucket "${this.config.bucket}"`);
      } catch (error) {
        this.logger.warn(
          `Object storage is not reachable at ${this.config.endpoint}. Uploads will fail until it is: ${
            (error as Error).message
          }`,
        );
      }
    }
  }

  /**
   * Builds a safe, collision-free object key.
   *
   * The client's filename is never used as a path — only as a sanitised
   * suffix — so a name like `../../etc/passwd` cannot escape the prefix.
   */
  buildKey(kind: string, originalName: string): string {
    const safeName = originalName
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-60);
    const now = new Date();
    const datePath = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    return `${kind.toLowerCase()}/${datePath}/${randomUUID()}-${safeName || "file"}`;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key })).catch(() => undefined);
  }

  /** Stable public URL for assets the bucket serves anonymously. */
  publicUrl(key: string): string {
    return `${this.config.publicUrl.replace(/\/$/, "")}/${key}`;
  }

  /** Time-limited URL for anything that should not be world-readable. */
  async signedUrl(key: string, expiresInSeconds = 900): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  async isReachable(): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.config.bucket }));
      return true;
    } catch {
      return false;
    }
  }
}
