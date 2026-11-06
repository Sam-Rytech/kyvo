import { redirect } from 'next/navigation';

/** Cards now lives on the Subscriptions page. */
export default function CardsPage() {
  redirect('/subscriptions#cards');
}
