import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type Match } from "@/lib/mockData";

interface MatchCardProps {
  match: Match;
  onViewDetails: (match: Match) => void;
}

export function MatchCard({ match, onViewDetails }: MatchCardProps) {
  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-900">{match.facility}</p>
            <p className="text-sm text-slate-600">{match.country}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{match.similarity}% similarity</Badge>
            <Badge variant="secondary">{match.outcome}</Badge>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-700">Diagnosis: {match.diagnosis}</p>
          <Button variant="secondary" size="sm" onClick={() => onViewDetails(match)}>
            View details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
