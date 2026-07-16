import { Pacifico } from "next/font/google";

const pacifico = Pacifico({ weight: "400", subsets: ["latin"] });

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-slate-50">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
          PERSONAL DIGIT SAFETY
        </p>

        <h1 className={`text-6xl tracking-normal text-cyan-400 ${pacifico.className}`}>SHADO</h1>

        <h2 className="mt-6 text-2xl font-semibold leading-tight text-slate-100">
          Check a suspicious message safely
        </h2>

        <p className="mt-4 max-w-sm text-base leading-7 text-slate-400">
          Local-first risk assessment. Not a fraud verdict.
        </p>
      </section>
    </main>
  );
}
