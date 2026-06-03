import React from "react";
import * as Lucide from "lucide-react";

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  stroke?: number;
}

export function Icon({ name, size = 20, color = "currentColor", stroke = 2 }: IconProps) {
  const LucideIcon = (Lucide as any)[name];
  if (!LucideIcon) return null;
  return <LucideIcon size={size} color={color} strokeWidth={stroke} />;
}
