const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat("en-GB")

export function formatCurrencyGBP(value: number): string {
  return currencyFormatter.format(value)
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

export function formatPercent(value: number, fractionDigits: number = 1): string {
  return `${value.toFixed(fractionDigits)}%`
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  })
}

export function formatLondonDateTime(date: Date): string {
  const dateTime = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  }).format(date)

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    timeZoneName: "shortOffset",
  }).formatToParts(date)

  const offsetPart = parts.find((part) => part.type === "timeZoneName")?.value
  const normalisedOffset = offsetPart?.replace("GMT", "UTC")

  return normalisedOffset ? `${dateTime} ${normalisedOffset}` : `${dateTime} UTC`
}

const relativeFormatter = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" })

export function formatRelativeTime(from: Date, to: Date = new Date()): string {
  const diffMs = from.getTime() - to.getTime()
  const diffMinutes = Math.round(diffMs / (60 * 1000))

  if (Math.abs(diffMinutes) < 60) {
    return relativeFormatter.format(diffMinutes, "minute")
  }

  const diffHours = Math.round(diffMs / (60 * 60 * 1000))
  if (Math.abs(diffHours) < 24) {
    return relativeFormatter.format(diffHours, "hour")
  }

  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000))
  return relativeFormatter.format(diffDays, "day")
}

