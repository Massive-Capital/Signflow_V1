export interface BrowserDetails {
  browserName?: string;
  browserVersion?: string;
  osName?: string;
  osVersion?: string;
  deviceType?: string;
}

export function parseUserAgent(userAgent?: string): BrowserDetails {
  if (!userAgent?.trim()) {
    return {};
  }

  const ua = userAgent.trim();
  const details: BrowserDetails = {};

  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    details.deviceType = 'mobile';
  } else if (/ipad|tablet|kindle|silk/i.test(ua)) {
    details.deviceType = 'tablet';
  } else {
    details.deviceType = 'desktop';
  }

  const windowsMatch = ua.match(/Windows NT ([\d.]+)/i);
  if (windowsMatch) {
    details.osName = 'Windows';
    details.osVersion = windowsMatch[1];
  } else if (/Mac OS X/i.test(ua)) {
    details.osName = 'macOS';
    const macMatch = ua.match(/Mac OS X ([\d_]+)/i);
    details.osVersion = macMatch?.[1]?.replace(/_/g, '.');
  } else if (/Android/i.test(ua)) {
    details.osName = 'Android';
    const androidMatch = ua.match(/Android ([\d.]+)/i);
    details.osVersion = androidMatch?.[1];
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    details.osName = 'iOS';
    const iosMatch = ua.match(/OS ([\d_]+)/i);
    details.osVersion = iosMatch?.[1]?.replace(/_/g, '.');
  } else if (/Linux/i.test(ua)) {
    details.osName = 'Linux';
  }

  const edgeMatch = ua.match(/Edg\/([\d.]+)/i);
  if (edgeMatch) {
    details.browserName = 'Edge';
    details.browserVersion = edgeMatch[1];
    return details;
  }

  const chromeMatch = ua.match(/Chrome\/([\d.]+)/i);
  if (chromeMatch && !/Chromium/i.test(ua)) {
    details.browserName = 'Chrome';
    details.browserVersion = chromeMatch[1];
    return details;
  }

  const firefoxMatch = ua.match(/Firefox\/([\d.]+)/i);
  if (firefoxMatch) {
    details.browserName = 'Firefox';
    details.browserVersion = firefoxMatch[1];
    return details;
  }

  const safariMatch = ua.match(/Version\/([\d.]+).*Safari/i);
  if (safariMatch) {
    details.browserName = 'Safari';
    details.browserVersion = safariMatch[1];
    return details;
  }

  const operaMatch = ua.match(/OPR\/([\d.]+)/i);
  if (operaMatch) {
    details.browserName = 'Opera';
    details.browserVersion = operaMatch[1];
    return details;
  }

  if (/curl/i.test(ua)) {
    details.browserName = 'cURL';
    details.deviceType = 'cli';
  } else if (/postman/i.test(ua)) {
    details.browserName = 'Postman';
    details.deviceType = 'cli';
  } else if (/insomnia/i.test(ua)) {
    details.browserName = 'Insomnia';
    details.deviceType = 'cli';
  }

  return details;
}
