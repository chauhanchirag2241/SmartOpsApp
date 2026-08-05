export interface SchoolBootstrap {
  id: string;
  name: string;
  subdomain: string;
  schoolCode?: string | null;
  shortName?: string | null;
  tagline?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string | null;
  accentColor?: string | null;
  textOnPrimary?: string | null;
  schemaName?: string;
}

export interface StoredTenant {
  id: string;
  name: string;
  subdomain: string;
  schoolCode: string;
}
