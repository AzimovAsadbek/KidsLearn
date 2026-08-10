import { imageSize } from "image-size";
import { MediaKind } from "@kidslearn/types";
import { ErrorCode } from "@kidslearn/types";
import { AppException } from "../common/errors/app-exception";

export interface ValidatedUpload {
  kind: MediaKind;
  mimeType: string;
  extension: string;
  width: number | null;
  height: number | null;
}

/** Magic-byte signatures. The client's Content-Type is never trusted. */
const SIGNATURES: Array<{ mime: string; ext: string; kind: MediaKind; test: (b: Buffer) => boolean }> = [
  { mime: "image/png", ext: "png", kind: MediaKind.IMAGE, test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/jpeg", ext: "jpg", kind: MediaKind.IMAGE, test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/gif", ext: "gif", kind: MediaKind.IMAGE, test: (b) => b.subarray(0, 6).toString("ascii") === "GIF89a" || b.subarray(0, 6).toString("ascii") === "GIF87a" },
  { mime: "image/webp", ext: "webp", kind: MediaKind.IMAGE, test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
  { mime: "image/svg+xml", ext: "svg", kind: MediaKind.IMAGE, test: (b) => /^\s*(<\?xml|<svg)/i.test(b.subarray(0, 200).toString("utf8")) },
  { mime: "audio/mpeg", ext: "mp3", kind: MediaKind.AUDIO, test: (b) => b.subarray(0, 3).toString("ascii") === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  { mime: "audio/wav", ext: "wav", kind: MediaKind.AUDIO, test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WAVE" },
  { mime: "audio/ogg", ext: "ogg", kind: MediaKind.AUDIO, test: (b) => b.subarray(0, 4).toString("ascii") === "OggS" },
  { mime: "video/mp4", ext: "mp4", kind: MediaKind.VIDEO, test: (b) => b.subarray(4, 8).toString("ascii") === "ftyp" },
  { mime: "video/webm", ext: "webm", kind: MediaKind.VIDEO, test: (b) => b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) },
  { mime: "application/pdf", ext: "pdf", kind: MediaKind.CERTIFICATE, test: (b) => b.subarray(0, 5).toString("ascii") === "%PDF-" },
];

export const MAX_SIZE_BY_KIND: Record<MediaKind, number> = {
  IMAGE: 8 * 1024 * 1024,
  AVATAR: 2 * 1024 * 1024,
  GENERATED: 8 * 1024 * 1024,
  AUDIO: 20 * 1024 * 1024,
  VIDEO: 200 * 1024 * 1024,
  CERTIFICATE: 5 * 1024 * 1024,
};

const MAX_IMAGE_DIMENSION = 6000;

/**
 * Validates an upload by inspecting its bytes.
 *
 * SVG is accepted but must be scanned: an SVG is an XML document that can carry
 * script and external references, so anything active is rejected outright
 * rather than sanitised and hoped for.
 */
export function validateUpload(buffer: Buffer, originalName: string, requestedKind?: MediaKind): ValidatedUpload {
  if (buffer.length === 0) {
    throw AppException.badRequest("That file is empty.", ErrorCode.UPLOAD_REJECTED);
  }

  const signature = SIGNATURES.find((candidate) => {
    try {
      return candidate.test(buffer);
    } catch {
      return false;
    }
  });

  if (!signature) {
    throw AppException.badRequest(
      "That file type isn't supported. Upload a PNG, JPEG, WebP, GIF, SVG, MP3, WAV, OGG, MP4 or WebM file.",
      ErrorCode.UPLOAD_REJECTED,
    );
  }

  // The extension must agree with the actual content, so "cat.png" cannot
  // secretly be a video (or a script) that a downstream tool would execute.
  const claimedExt = originalName.split(".").pop()?.toLowerCase() ?? "";
  const compatible = signature.ext === claimedExt || (signature.ext === "jpg" && claimedExt === "jpeg");
  if (claimedExt && !compatible) {
    throw AppException.badRequest(
      `The file contents are ${signature.mime} but the name ends in .${claimedExt}.`,
      ErrorCode.UPLOAD_REJECTED,
    );
  }

  if (signature.mime === "image/svg+xml") {
    assertSafeSvg(buffer);
  }

  const kind = requestedKind && kindMatches(requestedKind, signature.kind) ? requestedKind : signature.kind;

  const limit = MAX_SIZE_BY_KIND[kind];
  if (buffer.length > limit) {
    throw AppException.badRequest(
      `That file is ${(buffer.length / 1024 / 1024).toFixed(1)} MB. The limit for ${kind.toLowerCase()} is ${Math.round(limit / 1024 / 1024)} MB.`,
      ErrorCode.UPLOAD_REJECTED,
    );
  }

  let width: number | null = null;
  let height: number | null = null;
  if (signature.kind === MediaKind.IMAGE && signature.mime !== "image/svg+xml") {
    try {
      const dimensions = imageSize(buffer);
      width = dimensions.width ?? null;
      height = dimensions.height ?? null;
      if ((width && width > MAX_IMAGE_DIMENSION) || (height && height > MAX_IMAGE_DIMENSION)) {
        throw AppException.badRequest(
          `Images must be at most ${MAX_IMAGE_DIMENSION}px on each side.`,
          ErrorCode.UPLOAD_REJECTED,
        );
      }
    } catch (error) {
      if (error instanceof AppException) throw error;
      // Unreadable dimensions are not fatal for storage; they are just unknown.
    }
  }

  return { kind, mimeType: signature.mime, extension: signature.ext, width, height };
}

/** AVATAR and GENERATED are images; CERTIFICATE is a PDF. */
function kindMatches(requested: MediaKind, detected: MediaKind): boolean {
  if (requested === detected) return true;
  if (detected === MediaKind.IMAGE) return requested === MediaKind.AVATAR || requested === MediaKind.GENERATED;
  return false;
}

const DANGEROUS_SVG = /<script|javascript:|<foreignObject|<iframe|<embed|<object|on\w+\s*=/i;

function assertSafeSvg(buffer: Buffer): void {
  const text = buffer.toString("utf8");
  if (DANGEROUS_SVG.test(text)) {
    throw AppException.badRequest(
      "That SVG contains scripts or external content and can't be uploaded.",
      ErrorCode.UPLOAD_REJECTED,
    );
  }
}
