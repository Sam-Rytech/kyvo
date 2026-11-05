const STEPS = [
  { title: 'It reads your billing emails', body: 'Connect Gmail once. Kyvo finds your dollar subscriptions, trials and failed payments.' },
  { title: 'It learns how each one bills', body: 'Real dates, real amounts and past declines, remembered on Walrus. Forecasts improve as it learns.' },
  { title: 'It tells you what to fund, in time', body: 'The exact amount in your own currency, before the charge hits, with a warning on Telegram.' },
];

/** What a first-time visitor needs in 30 seconds (Gate 5). */
export function Landing() {
  return (
    <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-md" aria-labelledby="landing-title">
      <div>
        <h1 id="landing-title" className="text-heading-sm font-bold text-primary">
          Never get declined again.
        </h1>
        <p className="text-sm text-secondary mt-xs">Paying dollar subscriptions from a pre-funded card? A failed charge can cost you a fee, your access, or the card itself. Kyvo warns you first.</p>
      </div>
      <ol className="grid grid-cols-1 md:grid-cols-3 gap-sm">
        {STEPS.map((step, index) => (
          <li key={step.title} className="rounded-lg bg-secondary border border-secondary p-md">
            <p className="text-sm font-semibold text-primary">
              {index + 1}. {step.title}
            </p>
            <p className="text-xs text-secondary mt-xxs">{step.body}</p>
          </li>
        ))}
      </ol>
      <p className="text-xs text-tertiary">Below is a live demo, built from one person&apos;s real billing history. Try the &quot;Why?&quot; link and the &quot;Ignore memory&quot; switch.</p>
    </section>
  );
}
