import RetentionClient from "./RetentionClient"

type RetentionPageProps = {
  searchParams?: {
    [key: string]: string | string[] | undefined
  }
}

export default function RetentionPage({ searchParams }: RetentionPageProps) {
  return <RetentionClient initialSearchParams={searchParams} />
}
