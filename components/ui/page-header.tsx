'use client'

import * as React from "react"

import { uiTokens } from "@/lib/ui-tokens"
import { cn } from "@/lib/utils"
import { Badge } from "./badge"
import { useDemoMode } from "@/lib/demo-mode/context"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  actions?: React.ReactNode
  children?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  children,
  ...rest
}: PageHeaderProps) {
  const { demoMode, isHydrated, isDemoModeAvailable } = useDemoMode()
  const showDemoBadge = isHydrated && isDemoModeAvailable && demoMode

  return (
    <div
      className={cn(
        "flex flex-col border-b pb-6 transition-colors sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      style={{ gap: uiTokens.spacing.md }}
      {...rest}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1
            className="text-foreground"
            style={{
              fontSize: uiTokens.typography.h1.fontSize,
              lineHeight: uiTokens.typography.h1.lineHeight,
              fontWeight: uiTokens.typography.h1.fontWeight,
            }}
          >
            {title}
          </h1>
          {showDemoBadge ? (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    role="status"
                    tabIndex={0}
                    aria-live="polite"
                    aria-label="Demo mode is on"
                    variant="outline"
                    className="text-xs font-medium uppercase tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Demo
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Demo mode is on. Data shown is simulated.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
        {description ? (
          <p
            className="text-muted-foreground"
            style={{
              fontSize: uiTokens.typography.bodySm.fontSize,
              lineHeight: uiTokens.typography.bodySm.lineHeight,
              fontWeight: uiTokens.typography.bodySm.fontWeight,
            }}
          >
            {description}
          </p>
        ) : null}
        {children}
      </div>
      {actions ? (
        <div
          className="flex flex-wrap items-center"
          style={{ gap: uiTokens.spacing.sm }}
        >
          {actions}
        </div>
      ) : null}
    </div>
  )
}

