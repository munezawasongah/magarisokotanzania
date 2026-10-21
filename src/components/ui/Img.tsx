import Image, { type ImageProps } from "next/image";
import { cldTransform } from "@/lib/utils";

/** next/image wrapper: SVG placeholders bypass the optimiser; Cloudinary URLs get f_auto/q_auto. */
export function Img({ src, transform, alt, ...rest }: Omit<ImageProps, "src"> & { src: string; transform?: string }) {
  const isSvg = src.endsWith(".svg");
  return <Image src={transform ? cldTransform(src, transform) : src} alt={alt} unoptimized={isSvg} {...rest} />;
}
