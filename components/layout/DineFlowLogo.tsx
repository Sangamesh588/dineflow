import React from "react";
import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";

interface LogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function DineFlowLogo({ href = "/", size = "md", className = "" }: LogoProps) {
  const iconSizes = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  const content = (
    <div className={`flex items-center gap-2.5 font-bold tracking-tight text-cream ${className}`}>
      <div className="flex items-center justify-center rounded-xl bg-emerald p-2 text-cream shadow-md shadow-emerald/20">
        <UtensilsCrossed className={iconSizes[size]} />
      </div>
      <span className={`${textSizes[size]} font-semibold`}>
        Dine<span className="text-emerald">Flow</span>
      </span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
