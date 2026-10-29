import sharp from "sharp";
import { squareCrop, validSquareCrop } from "@/lib/images/square-crop";

export async function processProfilePhoto(bytes: Buffer, requestedCrop: unknown = null) {
  const image = sharp(bytes, { limitInputPixels: 16_000_000 });
  const metadata = await image.metadata();
  if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format) || (metadata.pages ?? 1) > 1) throw new Error("정적인 JPG·PNG·WebP 사진을 선택해 주십시오.");
  // Browser crop coordinates use the EXIF-oriented image, so orient before extracting.
  const source = await image.rotate().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = source.info;
  const crop = requestedCrop ?? squareCrop(width, height);
  if (!validSquareCrop(crop, width, height)) throw new Error("이미지 자르기 영역을 확인해 주십시오.");
  return sharp(source.data, { raw: { width, height, channels } }).extract({ left: crop.x, top: crop.y, width: crop.size, height: crop.size }).resize(256, 256).webp({ quality: 85 }).toBuffer();
}
