export type ClientePwaDevice = "ios" | "android" | "other";

export function detectClientePwaDevice(
  userAgent: string = typeof navigator !== "undefined"
    ? navigator.userAgent
    : "",
): ClientePwaDevice {
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return "ios";
  }

  if (/Android/.test(userAgent)) {
    return "android";
  }

  return "other";
}
