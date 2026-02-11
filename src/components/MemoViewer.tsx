import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface MemoViewerProps {
  sections: {
    presentingComplaint: string;
    caseTwinMatch: string;
    recommendedProtocol: string;
    logistics: string;
  };
}

export function MemoViewer({ sections }: MemoViewerProps) {
  const memoText = `Presenting Complaint\n${sections.presentingComplaint}\n\nCase-Twin Match\n${sections.caseTwinMatch}\n\nRecommended Protocol\n${sections.recommendedProtocol}\n\nLogistics\n${sections.logistics}`;

  const copyMemo = async () => {
    await navigator.clipboard.writeText(memoText);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Transfer Memo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <section className="space-y-1">
          <h4 className="text-sm font-medium text-slate-900">Presenting Complaint</h4>
          <p className="text-sm text-slate-700">{sections.presentingComplaint}</p>
        </section>
        <Separator />
        <section className="space-y-1">
          <h4 className="text-sm font-medium text-slate-900">Case-Twin Match</h4>
          <p className="text-sm text-slate-700">{sections.caseTwinMatch}</p>
        </section>
        <Separator />
        <section className="space-y-1">
          <h4 className="text-sm font-medium text-slate-900">Recommended Protocol</h4>
          <p className="text-sm text-slate-700">{sections.recommendedProtocol}</p>
        </section>
        <Separator />
        <section className="space-y-1">
          <h4 className="text-sm font-medium text-slate-900">Logistics</h4>
          <p className="text-sm text-slate-700">{sections.logistics}</p>
        </section>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button disabled>Download PDF</Button>
          <Button variant="secondary" onClick={copyMemo}>
            <Copy className="h-4 w-4" />
            Copy text
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
