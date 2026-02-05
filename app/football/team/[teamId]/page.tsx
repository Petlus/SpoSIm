import { TEAM_IDS } from '../../../../config/static-params';
import TeamPageClient from './TeamPageClient';

export function generateStaticParams() {
  return TEAM_IDS.map((id) => ({ teamId: String(id) }));
}

export default function TeamPage() {
  return <TeamPageClient />;
}
