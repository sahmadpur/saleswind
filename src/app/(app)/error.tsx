"use client";
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const forbidden = error.message === "Forbidden";
  const unauthorized = error.message === "Unauthorized";
  const icon = forbidden ? "lock" : unauthorized ? "login" : "error";
  const tint = forbidden ? "text-gyellow-dark bg-gyellow-50" : unauthorized ? "text-gblue bg-gblue-100" : "text-gred bg-gred-50";
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <span className={`mb-5 grid h-16 w-16 place-items-center rounded-full ${tint}`}>
        <span className="material-symbols-outlined" style={{ fontSize: 32 }}>{icon}</span>
      </span>
      <h1 className="text-2xl font-semibold text-gink">
        {forbidden ? "You don't have access to this page" : unauthorized ? "Please sign in" : "Something went wrong"}
      </h1>
      <p className="mt-2 text-sm text-ggrey">
        {forbidden ? "This area is restricted to other roles." : "An unexpected error occurred."}
      </p>
      {!forbidden && !unauthorized && (
        <button
          onClick={reset}
          className="g-press mt-7 inline-flex h-9 items-center rounded-md bg-gblue px-5 text-sm font-medium text-white transition-colors hover:bg-gblue-hover"
        >
          Try again
        </button>
      )}
    </div>
  );
}
