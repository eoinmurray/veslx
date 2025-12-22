import confetti from "canvas-confetti";

export const frontmatter = {
  title: "Static TSX Demo",
  description: "A TSX demo page with npm imports and zero layout wrappers.",
}

export default function Page() {
  return (
    <div className="relative h-screen overflow-hidden bg-[#0b0b10] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(56,189,248,0.16),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(236,72,153,0.18),transparent_40%)]" />
      <div className="relative mx-auto flex h-full max-w-4xl flex-col justify-center px-6">
        <p className="text-xs uppercase tracking-[0.4em] text-zinc-400">Static TSX demo</p>
        <h1 className="mt-4 text-5xl font-extrabold leading-[1.05] md:text-6xl">
          Raw layout, npm-powered.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-zinc-300">
          This page is a plain TSX component with a single npm import.
        </p>
        <div className="mt-8 flex items-center gap-4">
          <button
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black"
            onClick={() => confetti({ particleCount: 80, spread: 65, origin: { y: 0.6 } })}
          >
            Celebrate
          </button>
          <span className="text-xs uppercase tracking-[0.35em] text-zinc-500">canvas-confetti</span>
        </div>
      </div>
    </div>
  )
}
