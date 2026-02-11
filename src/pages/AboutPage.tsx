import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AboutPage() {
  return (
    <AppShell breadcrumb="About">
      <Card>
        <CardHeader>
          <CardTitle>About Case-Twin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-6 text-slate-700">
          <p>
            Case-Twin (MedRoute AI) is designed to support transfer planning by comparing a new
            clinical case against similar historical patterns across global facilities.
          </p>
          <p>
            The interface prioritizes rapid intake, transparent match details, triage guidance,
            and memo preparation for inter-hospital coordination. This page is intentionally UI
            only and uses structured mock data.
          </p>
          <p>
            The current build demonstrates frontend workflows for intake, triage review, transfer
            memo drafting, and expert-center highlighting without backend integration.
          </p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
