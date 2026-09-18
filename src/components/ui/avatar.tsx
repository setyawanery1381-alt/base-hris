import React from "react";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  photoUrl?: string | null;
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = "md", className = "", photoUrl }) => {
  const getInitials = (n: string) => {
    const parts = n.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (parts[0]?.[0] || "U").toUpperCase();
  };

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-xl",
  };

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover border border-slate-200 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center border border-primary/20 select-none shadow-sm ${className}`}
    >
      {getInitials(name)}
    </div>
  );
};