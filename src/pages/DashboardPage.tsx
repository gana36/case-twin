import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, MapPin } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MatchCard } from "@/components/MatchCard";
import { MemoViewer } from "@/components/MemoViewer";
import { UploadDropzone, type FileLike } from "@/components/UploadDropzone";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  equipmentOptions,
  expertBridge,
  fhirPreview,
  matches,
  memoText,
  metrics,
  triageFacilities,
  type Match
} from "@/lib/mockData";

const caseSchema = z.object({
  clinicalNotes: z.string().min(10, "Clinical notes should be at least 10 characters."),
  modality: z.enum(["xray", "ct", "mri", "histopathology"], {
    required_error: "Please select a modality."
  })
});

type CaseFormValues = z.infer<typeof caseSchema>;

const modalityOptions = [
  { label: "X-ray", value: "xray" },
  { label: "CT", value: "ct" },
  { label: "MRI", value: "mri" },
  { label: "Histopathology", value: "histopathology" }
];

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const [uploadedFile, setUploadedFile] = useState<FileLike | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [resultMatches, setResultMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [triageFilters, setTriageFilters] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<CaseFormValues>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      clinicalNotes: "",
      modality: undefined
    }
  });

  const selectedModality = watch("modality");

  const onSubmit = async () => {
    setLoading(true);
    setShowResults(false);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setResultMatches(matches);
    setShowResults(true);
    setLoading(false);
  };

  const handleReset = () => {
    reset({ clinicalNotes: "", modality: undefined });
    setUploadedFile(null);
    setShowResults(false);
    setResultMatches([]);
    setSelectedMatch(null);
  };

  const filteredFacilities = useMemo(() => {
    if (triageFilters.length === 0) {
      return triageFacilities;
    }

    return triageFacilities.filter((facility) =>
      triageFilters.some((filter) => facility.equipment.toLowerCase().includes(filter.toLowerCase()))
    );
  }, [triageFilters]);

  return (
    <AppShell breadcrumb="Dashboard">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>New Case</CardTitle>
            <CardDescription>Upload imaging data and provide clinical context.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <UploadDropzone value={uploadedFile} onChange={setUploadedFile} />

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">Clinical notes</label>
                <Textarea placeholder="Enter concise findings and patient context." {...register("clinicalNotes")} />
                {errors.clinicalNotes ? (
                  <p className="text-xs text-red-600">{errors.clinicalNotes.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">Modality</label>
                <Select
                  options={modalityOptions}
                  placeholder="Select modality"
                  value={selectedModality ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "") {
                      return;
                    }
                    setValue("modality", value as CaseFormValues["modality"], {
                      shouldValidate: true
                    });
                  }}
                />
                {errors.modality ? <p className="text-xs text-red-600">{errors.modality.message}</p> : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit">Find Case Twins</Button>
                <Button type="button" variant="secondary" onClick={handleReset}>
                  Reset
                </Button>
              </div>
            </form>

            <Accordion>
              <AccordionItem value="fhir-preview">
                <AccordionTrigger>FHIR Preview</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                      {JSON.stringify(fhirPreview, null, 2)}
                    </pre>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(JSON.stringify(fhirPreview, null, 2))}
                    >
                      <Copy className="h-4 w-4" />
                      Copy JSON
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricCard label="Top Similarity" value={metrics.topSimilarity} />
            <MetricCard label="Matches Returned" value={metrics.matchesReturned} />
            <MetricCard label="Recommended Center" value={metrics.recommendedCenter} />
          </div>

          {loading ? (
            <Card>
              <CardContent className="space-y-3 pt-5">
                <Skeleton className="h-10 w-72" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-5">
                <Tabs defaultValue="case-twins">
                  <TabsList>
                    <TabsTrigger value="case-twins">Case Twins</TabsTrigger>
                    <TabsTrigger value="triage">Triage</TabsTrigger>
                    <TabsTrigger value="transfer-memo">Transfer Memo</TabsTrigger>
                    <TabsTrigger value="expert-bridge">Expert Bridge</TabsTrigger>
                  </TabsList>

                  <TabsContent value="case-twins" className="space-y-3">
                    {(showResults ? resultMatches : matches).map((match) => (
                      <MatchCard key={match.id} match={match} onViewDetails={setSelectedMatch} />
                    ))}
                  </TabsContent>

                  <TabsContent value="triage" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Equipment Filters</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {equipmentOptions.map((option) => {
                            const checked = triageFilters.includes(option);
                            return (
                              <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() =>
                                    setTriageFilters((prev) =>
                                      prev.includes(option)
                                        ? prev.filter((entry) => entry !== option)
                                        : [...prev, option]
                                    )
                                  }
                                />
                                {option}
                              </label>
                            );
                          })}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Coverage Map</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="relative h-44 rounded-xl border border-slate-200 bg-slate-100">
                            <MapPin className="absolute left-10 top-10 h-4 w-4 text-slate-500" />
                            <MapPin className="absolute left-28 top-20 h-4 w-4 text-slate-500" />
                            <MapPin className="absolute right-16 top-16 h-4 w-4 text-slate-500" />
                            <MapPin className="absolute right-10 bottom-10 h-4 w-4 text-slate-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Ranked Facilities</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Rank</TableHead>
                              <TableHead>Facility</TableHead>
                              <TableHead>Distance</TableHead>
                              <TableHead>Equipment</TableHead>
                              <TableHead>Reason</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredFacilities.map((facility) => (
                              <TableRow key={facility.rank}>
                                <TableCell>{facility.rank}</TableCell>
                                <TableCell>{facility.facility}</TableCell>
                                <TableCell>{facility.distance}</TableCell>
                                <TableCell>{facility.equipment}</TableCell>
                                <TableCell>{facility.reason}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="transfer-memo">
                    <MemoViewer sections={memoText} />
                  </TabsContent>

                  <TabsContent value="expert-bridge">
                    <Card>
                      <CardHeader>
                        <CardTitle>{expertBridge.center}</CardTitle>
                        <CardDescription>Global expert center recommendation</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-slate-700">{expertBridge.summary}</p>
                        <Button disabled>Contact Department</Button>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={Boolean(selectedMatch)}>
        {selectedMatch ? (
          <DialogContent onClose={() => setSelectedMatch(null)}>
            <DialogHeader>
              <DialogTitle>{selectedMatch.facility}</DialogTitle>
              <DialogDescription>
                {selectedMatch.country} • {selectedMatch.diagnosis}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {Object.entries(selectedMatch.details).map(([key, value]) => (
                <div key={key} className="grid grid-cols-3 gap-3 rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-medium text-slate-900">{key}</p>
                  <p className="col-span-2 text-sm text-slate-700">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button>Generate Transfer Memo</Button>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </AppShell>
  );
}
