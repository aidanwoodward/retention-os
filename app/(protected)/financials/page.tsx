import FinancialsClient from "./FinancialsClient"

type FinancialsPageProps = {
  searchParams?: {
    [key: string]: string | string[] | undefined
  }
}

export default function FinancialsPage({ searchParams }: FinancialsPageProps) {
  return <FinancialsClient initialSearchParams={searchParams} />
}

