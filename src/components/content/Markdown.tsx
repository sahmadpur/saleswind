import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// No typography plugin in this project: style elements explicitly. Raw HTML is not rendered.
const components: Components = {
  h1: (p) => <h1 className="mb-3 mt-8 text-2xl font-semibold tracking-[-0.015em] text-gink first:mt-0" {...p} />,
  h2: (p) => <h2 className="mb-2 mt-7 text-lg font-semibold text-gink first:mt-0" {...p} />,
  h3: (p) => <h3 className="mb-2 mt-5 text-base font-semibold text-gink first:mt-0" {...p} />,
  p: (p) => <p className="my-3 leading-relaxed text-gink-2" {...p} />,
  ul: (p) => <ul className="my-3 list-disc space-y-1 pl-6 text-gink-2" {...p} />,
  ol: (p) => <ol className="my-3 list-decimal space-y-1 pl-6 text-gink-2" {...p} />,
  a: (p) => <a className="text-gblue underline-offset-2 hover:underline" target="_blank" rel="noreferrer" {...p} />,
  blockquote: (p) => <blockquote className="my-4 border-l-4 border-gblue-200 bg-gblue-50 px-4 py-2 text-gink-2" {...p} />,
  code: (p) => <code className="rounded bg-ghover px-1 py-0.5 font-mono text-[0.85em] text-gink" {...p} />,
  pre: (p) => <pre className="my-4 overflow-x-auto rounded-md bg-ghover p-3 text-sm [&_code]:bg-transparent [&_code]:p-0" {...p} />,
  hr: () => <hr className="my-6 border-gline-2" />,
  table: (p) => <div className="my-4 overflow-x-auto"><table className="w-full border-collapse text-sm" {...p} /></div>,
  th: (p) => <th className="border border-gline-2 bg-gbg px-3 py-1.5 text-left font-semibold text-gink" {...p} />,
  td: (p) => <td className="border border-gline-2 px-3 py-1.5 text-gink-2" {...p} />,
  // Arbitrary external images with unknown dimensions; next/image does not fit here.
  // eslint-disable-next-line @next/next/no-img-element
  img: (p) => <img className="my-4 max-w-full rounded-md" alt="" {...p} />,
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-[15px]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{children}</ReactMarkdown>
    </div>
  );
}
