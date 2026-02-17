import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for merging tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ----------------------------------------------------------------------------
// React Native Primitives Simulation
// These components mimic RN behavior to facilitate future migration
// ----------------------------------------------------------------------------

interface ViewProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
}

export const View = React.forwardRef<HTMLDivElement, ViewProps>(
  ({ className, as: Component = "div", ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn("flex flex-col relative box-border min-w-0", className)}
        {...props}
      />
    );
  }
);
View.displayName = "View";

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  as?: React.ElementType;
  variant?: "h1" | "h2" | "h3" | "body" | "caption" | "label";
}

export const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, as, variant = "body", ...props }, ref) => {
    let Component = as || "p";
    
    // Default semantic tags based on variant if not overridden
    if (!as) {
      if (variant === "h1") Component = "h1";
      if (variant === "h2") Component = "h2";
      if (variant === "h3") Component = "h3";
      if (variant === "label") Component = "span";
    }

    const baseStyles = "font-sans text-[#2F5641] m-0 p-0 leading-normal";
    
    const variantStyles = {
      h1: "font-display text-2xl font-bold",
      h2: "font-display text-xl font-semibold",
      h3: "font-display text-lg font-medium",
      body: "text-sm",
      caption: "text-[10px] text-[#8B9286]",
      label: "text-[10px] font-bold uppercase tracking-wider text-[#8B9286]",
    };

    return (
      <Component
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], className)}
        {...props}
      />
    );
  }
);
Text.displayName = "Text";

// ----------------------------------------------------------------------------
// Touchable / Pressable
// ----------------------------------------------------------------------------

interface PressableProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  activeOpacity?: number;
}

export const Pressable = React.forwardRef<HTMLButtonElement, PressableProps>(
  ({ className, activeOpacity = 0.7, style, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "cursor-pointer touch-manipulation select-none transition-opacity active:opacity-70 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        type="button"
        {...props}
      />
    );
  }
);
Pressable.displayName = "Pressable";
