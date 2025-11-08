import ProductsClient from "./ProductsClient"

type ProductsPageProps = {
  searchParams?: {
    [key: string]: string | string[] | undefined
  }
}

export default function ProductsPage({ searchParams }: ProductsPageProps) {
  return <ProductsClient initialSearchParams={searchParams} />
}
