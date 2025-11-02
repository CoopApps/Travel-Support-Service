/**
 * Subdomain Detection Utility
 *
 * Detects which tenant subdomain the app is running on
 */

export interface SubdomainInfo {
  subdomain: string | null;
  isPlatformAdmin: boolean;
  hostname: string;
}

/**
 * Extract subdomain from hostname
 */
export function detectSubdomain(): SubdomainInfo {
  const hostname = window.location.hostname;

  // localhost or 127.0.0.1 - check for subdomain prefix
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return {
      subdomain: null,
      isPlatformAdmin: true,
      hostname,
    };
  }

  // Pattern: demo.localhost or subdomain.localhost
  if (hostname.includes('.localhost')) {
    const parts = hostname.split('.');
    if (parts.length >= 2 && parts[0] !== 'localhost') {
      return {
        subdomain: parts[0],
        isPlatformAdmin: false,
        hostname,
      };
    }
  }

  // Production pattern: demo.travelapp.com
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return {
      subdomain: parts[0],
      isPlatformAdmin: false,
      hostname,
    };
  }

  // Root domain - platform admin
  return {
    subdomain: null,
    isPlatformAdmin: true,
    hostname,
  };
}

/**
 * Get current subdomain
 */
export function getCurrentSubdomain(): string | null {
  return detectSubdomain().subdomain;
}

/**
 * Check if on platform admin domain
 */
export function isPlatformAdminDomain(): boolean {
  return detectSubdomain().isPlatformAdmin;
}

/**
 * Build tenant URL
 */
export function buildTenantUrl(subdomain: string, path: string = ''): string {
  const protocol = window.location.protocol;
  const port = window.location.port;
  const portSuffix = port ? `:${port}` : '';

  // For localhost development
  if (window.location.hostname.includes('localhost')) {
    return `${protocol}//${subdomain}.localhost${portSuffix}${path}`;
  }

  // For production
  const baseDomain = window.location.hostname.split('.').slice(-2).join('.');
  return `${protocol}//${subdomain}.${baseDomain}${path}`;
}
