"use client";

import { LoaderIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface LoadingButtonProps {
  isLoading: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
  loadingText?: string;
}

export function LoadingButton({
  isLoading,
  onClick,
  children,
  variant = "default",
  size = "default",
  className = "",
  disabled = false,
  loadingText = "Processing..."
}: LoadingButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={isLoading || disabled}
      variant={variant}
      size={size}
      className={`relative ${className}`}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Spinner className="w-4 h-4" />
          <span>{loadingText}</span>
        </div>
      ) : (
        children
      )}
    </Button>
  );
}

interface RefreshButtonProps {
  isLoading: boolean;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  loadingText?: string;
}

export function RefreshButton({
  isLoading,
  onClick,
  className = "",
  disabled = false,
  loadingText = "Refreshing..."
}: RefreshButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={isLoading || disabled}
      variant="outline"
      size="sm"
      className={`relative ${className}`}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>{loadingText}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </div>
      )}
    </Button>
  );
}

interface ProcessingButtonProps {
  isLoading: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
}

export function ProcessingButton({
  isLoading,
  onClick,
  children,
  className = "",
  disabled = false,
  loadingText = "Processing...",
  icon
}: ProcessingButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`relative ${className}`}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <LoaderIcon className="w-4 h-4 animate-spin" />
          <span>{loadingText}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {icon}
          <span>{children}</span>
        </div>
      )}
    </Button>
  );
}
