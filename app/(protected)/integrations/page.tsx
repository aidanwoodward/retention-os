import IntegrationsClient from "./IntegrationsClient"

type IntegrationsPageProps = {
  searchParams?: {
    [key: string]: string | string[] | undefined
  }
}

export default function IntegrationsPage({ searchParams }: IntegrationsPageProps) {
  return <IntegrationsClient initialSearchParams={searchParams} />
}
