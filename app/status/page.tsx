import { redirect } from 'next/navigation';

/** Live checks now live on How it's verified. */
export default function StatusPage() {
  redirect('/proof#status');
}
