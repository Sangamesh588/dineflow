import QRCode from "qrcode";

export async function generateQrDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 400,
      margin: 2,
      color: {
        dark: "#171A19",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "H",
    });
  } catch (err) {
    console.error("Error generating QR code:", err);
    return "";
  }
}

export function buildTableUrl(appUrl: string, restaurantSlug: string, qrToken: string): string {
  const baseUrl = appUrl.replace(/\/$/, "");
  return `${baseUrl}/menu/${restaurantSlug}?table_token=${qrToken}`;
}
