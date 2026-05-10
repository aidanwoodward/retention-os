import ReportsClient from "./ReportsClient";

type ReportsSearchParams = Record<string, string | string[] | undefined>;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<ReportsSearchParams>;
}) {
  const resolved =
    searchParams !== undefined ? await searchParams : undefined;
  return <ReportsClient initialSearchParams={resolved} />;
}
