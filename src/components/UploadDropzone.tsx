import * as React from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FileLike = {
  name: string;
  size: number;
};

interface UploadDropzoneProps {
  value: FileLike | null;
  onChange: (file: FileLike | null) => void;
}

const acceptedTypes = ".dcm,.jpg,.jpeg,.png";

export function UploadDropzone({ value, onChange }: UploadDropzoneProps) {
  const [dragActive, setDragActive] = React.useState(false);

  const handleNativeFile = (file: File) => {
    onChange({ name: file.name, size: file.size });
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleNativeFile(file);
    }
  };

  return (
    <div className="space-y-3">
      <div
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        className={cn(
          "rounded-xl border border-dashed border-slate-300 p-6 text-center transition-colors",
          dragActive ? "border-blue-500 bg-blue-50/40" : "bg-white"
        )}
      >
        <Upload className="mx-auto mb-2 h-5 w-5 text-slate-500" />
        <p className="text-sm text-slate-700">Drop imaging files here</p>
        <p className="mt-1 text-xs text-slate-500">Accepted: .dcm, .jpg, .jpeg, .png</p>
        <label className="mt-4 inline-block cursor-pointer rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          Browse files
          <input
            type="file"
            accept={acceptedTypes}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                handleNativeFile(file);
              }
            }}
          />
        </label>
      </div>

      {value ? (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
          <div>
            <p className="text-sm text-slate-900">{value.name}</p>
            <p className="text-xs text-slate-600">{(value.size / 1024).toFixed(1)} KB</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            <X className="h-4 w-4" />
            Remove
          </Button>
        </div>
      ) : null}
    </div>
  );
}
