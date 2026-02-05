import { LEAGUE_IDS } from '../../../config/static-params';
import LeaguePageClient from './LeaguePageClient';

export function generateStaticParams() {
  return LEAGUE_IDS.map((id) => ({ leagueId: String(id) }));
}

export default function LeaguePage() {
  return <LeaguePageClient />;
}
