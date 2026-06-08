import { ImageResponse } from "next/og";

// Apple touch icon — generated as a PNG since the apple-icon convention does
// not support SVG. Mirrors the brand mark in icon.svg (white "S" on Google blue).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a73e8",
          color: "#ffffff",
          fontSize: 118,
          fontWeight: 700,
          fontFamily: "sans-serif",
          borderRadius: 40,
        }}
      >
        S
      </div>
    ),
    { ...size },
  );
}
