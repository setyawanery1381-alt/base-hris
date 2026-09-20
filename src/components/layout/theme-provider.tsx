"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface TenantTheme {
  appName: string;
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string | null;
  footerText: string;
}

const defaultTheme: TenantTheme = {
  appName: "BASE HRIS",
  companyName: "BASE HRIS Platform",
  primaryColor: "#4f46e5",
  secondaryColor: "#818cf8",
  footerText: "Powered by BASE HRIS SaaS",
};

const ThemeContext = createContext<{
  theme: TenantTheme;
  setTheme: (t: TenantTheme) => void;
  reloadBranding: () => Promise<void>;
}>({
  theme: defaultTheme,
  setTheme: () => {},
  reloadBranding: async () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  initialTheme?: TenantTheme | null;
}> = ({ children, initialTheme }) => {
  const [theme, setTheme] = useState<TenantTheme>(initialTheme || defaultTheme);

  const reloadBranding = async () => {
    try {
      const res = await fetch("/api/v1/tenant/branding");
      if (res.ok) {
        const data = await res.json();
        if (data && data.primaryColor) {
          setTheme((prev) => ({
            ...prev,
            appName: data.appName || prev.appName,
            companyName: data.companyName || prev.companyName,
            primaryColor: data.primaryColor || prev.primaryColor,
            secondaryColor: data.secondaryColor || prev.secondaryColor,
            logoUrl: data.logoUrl !== undefined ? data.logoUrl : prev.logoUrl,
            footerText: data.footerText || prev.footerText,
          }));
        }
      }
    } catch (e) {
      console.error("Failed to load tenant branding:", e);
    }
  };

  useEffect(() => {
    reloadBranding();

    const handleBrandingUpdate = (e: any) => {
      if (e.detail) {
        setTheme((prev) => ({
          ...prev,
          ...e.detail,
        }));
      } else {
        reloadBranding();
      }
    };

    window.addEventListener("tenant-branding-updated", handleBrandingUpdate);
    window.addEventListener("storage", (e) => {
      if (e.key === "tenant_branding_updated") {
        reloadBranding();
      }
    });

    return () => {
      window.removeEventListener("tenant-branding-updated", handleBrandingUpdate);
    };
  }, []);

  useEffect(() => {
    // Apply CSS variables to root dynamically
    const root = document.documentElement;
    root.style.setProperty("--color-primary", theme.primaryColor);
    root.style.setProperty("--color-secondary", theme.secondaryColor);
    root.style.setProperty("--color-primary-light", `${theme.primaryColor}1a`);
    root.style.setProperty("--color-secondary-light", `${theme.secondaryColor}1a`);

    // document title
    if (theme.appName) {
      document.title = `${theme.appName} — Enterprise HRIS`;
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, reloadBranding }}>
      {children}
    </ThemeContext.Provider>
  );
};