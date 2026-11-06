export function TelegramCard({ linked, linkUrl }: { linked: boolean; linkUrl: string }) {
  return (
    <section className="space-y-xs border-t border-secondary pt-lg min-w-0" aria-labelledby="telegram-title">
      <h2 id="telegram-title" className="section-title">
        Telegram alerts
      </h2>
      {linked ? (
        <p className="text-sm text-secondary">On. Kyvo messages you each morning, and before a charge can fail. Send /unlink to the bot to stop.</p>
      ) : (
        <>
          <p className="text-sm text-secondary">Get warned 48 hours before a charge your card can&apos;t cover.</p>
          <a href={linkUrl} target="_blank" rel="noreferrer" className="inline-block rounded-lg bg-brand-solid px-md py-xs text-sm font-semibold text-primary-on-brand">
            Connect Telegram
          </a>
        </>
      )}
    </section>
  );
}
