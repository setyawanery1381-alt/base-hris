import { db } from "./db";

export interface TenantBranding {
  appName: string;
  companyName: string;
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  footerText: string;
}

export async function getTenantBranding(companyId: string): Promise<TenantBranding> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    include: { branding: true },
  });

  if (!company) {
    return {
      appName: "BASE HRIS",
      companyName: "BASE HRIS Platform",
      primaryColor: "#1E40AF",
      secondaryColor: "#3B82F6",
      footerText: "Powered by BASE HRIS SaaS",
    };
  }

  return {
    appName: company.branding?.appName || company.name,
    companyName: company.name,
    logoUrl: company.branding?.logoUrl,
    primaryColor: company.branding?.primaryColor || "#1E40AF",
    secondaryColor: company.branding?.secondaryColor || "#3B82F6",
    footerText: company.branding?.footerText || `© ${new Date().getFullYear()} ${company.name}`,
  };
}

export async function isFeatureEnabled(companyId: string, featureId: string): Promise<boolean> {
  const feat = await db.companyFeature.findUnique({
    where: {
      companyId_featureId: {
        companyId,
        featureId,
      },
    },
  });
  return feat ? feat.isEnabled : true;
}