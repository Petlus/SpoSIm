import TournamentPageClient from './TournamentPageClient';

const TOURNAMENT_IDS = [2001, 2146, 2154];

export function generateStaticParams() {
  return TOURNAMENT_IDS.map((id) => ({ leagueId: String(id) }));
}

export default function TournamentPage() {
  return <TournamentPageClient />;
}
