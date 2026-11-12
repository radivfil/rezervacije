import QRCode from "qrcode";

/** QR kod kao SVG (crno na bijelom radi pouzdanog skeniranja). */
export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
}
