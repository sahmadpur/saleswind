import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-xl font-medium text-neutral-900">Not found</h1>
      <p className="mt-2 text-sm text-neutral-500">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/opportunities" className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
        Back to Opportunities
      </Link>
    </div>
  );
}
