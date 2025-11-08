import ReportsClient from "./ReportsClient"

export default function ReportsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  return <ReportsClient initialSearchParams={searchParams} />
}
