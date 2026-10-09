import { expiryLabel, expiryStatus } from '../domain/dates'

export function ExpiryBadge({ date }: { date: string | null }) {
  return <span className={`badge badge-${expiryStatus(date)}`}>{expiryLabel(date)}</span>
}
