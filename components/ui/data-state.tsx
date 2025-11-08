import { AlertTriangle } from "lucide-react"

import { uiTokens } from "@/lib/ui-tokens"
import { cn } from "@/lib/utils"

import { Button } from "./button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "./empty"
import { Skeleton } from "./skeleton"

export type DataStateStatus = "loading" | "empty" | "error" | "ready"

interface DataStateProps {
  status: DataStateStatus
  loading?: React.ReactNode
  empty?: React.ReactNode
  error?: React.ReactNode
  children: React.ReactNode
}

const defaultSkeleton = (
  <div
    className="flex flex-col"
    aria-busy="true"
    data-testid="state-loading"
    style={{ gap: uiTokens.spacing.section }}
  >
    <Skeleton className="h-20 w-full rounded-xl" />
    <div
      className="grid md:grid-cols-2 xl:grid-cols-4"
      style={{ gap: uiTokens.spacing.md }}
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton
          // biome-ignore lint/suspicious/noArrayIndexKey: deterministic placeholder only
          key={index}
          className="h-32 rounded-xl"
        />
      ))}
    </div>
    <Skeleton className="h-64 w-full rounded-xl" />
  </div>
)

interface EmptyStateProps {
  title: string
  description: string
  action?: {
    label: string
    href?: string
  }
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Empty className="border-dashed border-muted/80">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action ? (
        <EmptyContent>
          <Button asChild variant="outline">
            <a href={action.href ?? "#"}>{action.label}</a>
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  )
}

interface ErrorStateProps {
  title?: string
  message: string
  action?: {
    label: string
    href?: string
  }
  className?: string
}

export function ErrorState({
  title = "We hit a snag",
  message,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "border-destructive/40 bg-destructive/5 text-destructive flex flex-col gap-3 rounded-xl border p-6",
        className
      )}
      data-testid="state-error"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
        <div className="space-y-1">
          <p className="text-base font-semibold">{title}</p>
          <p className="text-sm text-destructive/90">{message}</p>
        </div>
      </div>
      {action ? (
        <div>
          <Button asChild size="sm" variant="outline">
            <a href={action.href ?? "#"}>{action.label}</a>
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function DataState({
  status,
  loading = defaultSkeleton,
  empty,
  error,
  children,
}: DataStateProps) {
  if (status === "loading") {
    return <>{loading}</>
  }

  if (status === "empty" && empty) {
    return <>{empty}</>
  }

  if (status === "error" && error) {
    return <>{error}</>
  }

  return <>{children}</>
}

