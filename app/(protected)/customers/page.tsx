import CustomersClient from "./CustomersClient"

type CustomersPageProps = {
  searchParams?: {
    [key: string]: string | string[] | undefined
  }
}

export default function CustomersPage({ searchParams }: CustomersPageProps) {
  return <CustomersClient initialSearchParams={searchParams} />
}
