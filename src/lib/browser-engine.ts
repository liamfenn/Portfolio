// These workarounds target engine behavior; Chrome on iOS uses WebKit and has no Chrome/ token.
export function isChromium(userAgent: string) {
  return /\b(?:Chrome|HeadlessChrome|Chromium)\//.test(userAgent);
}

export function isSafari(userAgent: string) {
  return /AppleWebKit\/.*Version\/.*Safari\//.test(userAgent) && !isChromium(userAgent);
}
