import IntegrationsClient from "./IntegrationsClient";

type IntegrationsSearchParams = Record<
  string,
  string | string[] | undefined
>;

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams?: Promise<IntegrationsSearchParams>;
}) {
  const resolved =
    searchParams !== undefined ? await searchParams : undefined;
  return (
    <IntegrationsClient initialSearchParams={resolved} />
  );
}
