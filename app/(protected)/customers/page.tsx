import CustomersClient from "./CustomersClient";

type CustomersSearchParams = Record<string, string | string[] | undefined>;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams?: Promise<CustomersSearchParams>;
}) {
  const resolved =
    searchParams !== undefined ? await searchParams : undefined;
  return <CustomersClient initialSearchParams={resolved} />;
}
