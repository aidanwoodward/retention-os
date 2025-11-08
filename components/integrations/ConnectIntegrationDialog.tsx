'use client'

import { ArrowRight } from "lucide-react"
import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConnectIntegrationDialogProps {
  integrationName: string
  triggerLabel?: string
  steps: string[]
}

export function ConnectIntegrationDialog({
  integrationName,
  triggerLabel = "Connect",
  steps,
}: ConnectIntegrationDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect {integrationName}</DialogTitle>
          <DialogDescription>
            Follow the steps below to authenticate and start syncing.
          </DialogDescription>
        </DialogHeader>
        <ol className="list-decimal space-y-3 pl-4 text-sm text-foreground">
          {steps.map((step) => (
            <li key={step} className="leading-relaxed">
              {step}
            </li>
          ))}
        </ol>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" size="sm">
            View docs
          </Button>
          <Button size="sm">
            Continue
            <ArrowRight className="ml-2 size-4" aria-hidden="true" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

