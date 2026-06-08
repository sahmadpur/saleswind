"use client";
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const forbidden = error.message === "Forbidden";
  const unauthorized = error.message === "Unauthorized";
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-xl font-medium text-neutral-900">
        {forbidden ? "You don't have access to this page" : unauthorized ? "Please sign in" : "Something went wrong"}
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        {forbidden ? "This area is restricted to other roles." : "An unexpected error occurred."}
      </p>
      {!forbidden && !unauthorized && (
        <button onClick={reset} className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Try again</button>
      )}
    </div>
  );
}
