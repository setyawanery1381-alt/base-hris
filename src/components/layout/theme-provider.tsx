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
  primaryColor: "#0d9488",
  secondaryColor: "#14b8a6",
  footerText: "Powered by BASE HRIS SaaS",
};

const ThemeContext = createContext<{
  theme: TenantTheme;
  setTheme: (t: TenantTheme) => void;
}>({
  theme: defaultTheme,
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  initialTheme?: TenantTheme | null;
}> = ({ children, initialTheme }) => {
  const [theme, setTheme] = useState<TenantTheme>(initialTheme || defaultTheme);

  useEffect(() => {
    // Apply CSS variables to root dynamically
    const root = document.documentElement;
    root.style.setProperty("--color-primary", theme.primaryColor);
    root.style.setProperty("--color-secondary", theme.secondaryColor);
    // document title
    if (theme.appName) {
      document.title = `${theme.appName} — Enterprise HRIS`;
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};