import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <span className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-ghover text-ggrey">
        <span className="material-symbols-outlined" style={{ fontSize: 32 }}>search_off</span>
      </span>
      <h1 className="text-2xl font-normal text-gink">Not found</h1>
      <p className="mt-2 text-sm text-ggrey">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link
        href="/opportunities"
        className="g-press mt-7 inline-flex h-9 items-center rounded-full bg-gblue px-6 text-sm font-medium text-white shadow-g1 transition-shadow hover:bg-gblue-hover hover:shadow-g2"
      >
        Back to Opportunities
      </Link>
    </div>
  );
}
