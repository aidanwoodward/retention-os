import SegmentsClient from "./SegmentsClient"

type SegmentsPageProps = {
  searchParams?: {
    [key: string]: string | string[] | undefined
  }
}

export default function SegmentsPage({ searchParams }: SegmentsPageProps) {
  return <SegmentsClient initialSearchParams={searchParams} />
}
