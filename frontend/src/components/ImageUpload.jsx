import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2, X, Image as ImageIcon } from "lucide-react";
import api, { formatApiError, API_BASE } from "../lib/api";

/**
 * Reusable image upload field for the admin panel.
 *
 * Props:
 *  - value: string (current image URL — absolute or `/api/uploads/...`)
 *  - onChange(url: string): called with the saved URL right after upload
 *  - label: optional label text
 *  - previewClass: optional className for the preview <img>
 *  - testIdPrefix: optional, e.g. "book-cover" → input `${prefix}-input`, clear `${prefix}-clear`
 */
export default function ImageUpload({ value, onChange, label, previewClass, testIdPrefix = "img" }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  // Convert backend-relative URL to absolute for display
  const displayUrl = (() => {
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    if (value.startsWith("/api/")) {
      const base = API_BASE.replace(/\/api$/, "");
      return `${base}${value}`;
    }
    return value;
  })();

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image is larger than 8 MB");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/admin/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(data.url);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(formatApiError(e));
    }
    setUploading(false);
  };

  const onPick = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleFile(file);
    e.target.value = ""; // reset so same file can be re-selected
  };

  const clear = () => onChange("");

  return (
    <div>
      {label && <label className="text-[11px] text-muted-foreground block mb-1">{label}</label>}
      <div className="flex items-start gap-3">
        <div className={`relative bg-ink-900 border border-white/[0.07] rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 ${previewClass || "w-28 h-28"}`}>
          {displayUrl ? (
            <img src={displayUrl} alt="" className="w-full h-full object-cover" data-testid={`${testIdPrefix}-preview`} />
          ) : (
            <ImageIcon className="w-7 h-7 text-muted-foreground/40" strokeWidth={1.4} />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-brand-gold animate-spin" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            onChange={onPick}
            className="hidden"
            data-testid={`${testIdPrefix}-input`}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            data-testid={`${testIdPrefix}-pick`}
            className="flex items-center gap-1.5 bg-gold-gradient text-ink-950 px-3 py-1.5 rounded-lg text-xs font-extrabold disabled:opacity-60"
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? "Uploading..." : (displayUrl ? "Replace Image" : "Upload Image")}
          </button>
          {displayUrl && (
            <button
              type="button"
              onClick={clear}
              data-testid={`${testIdPrefix}-clear`}
              className="flex items-center gap-1.5 text-red-400 hover:bg-red-500/10 px-2 py-1 rounded-md text-[11px] font-semibold w-fit"
            >
              <X className="w-3 h-3" /> Remove
            </button>
          )}
          <p className="text-[10px] text-muted-foreground leading-snug max-w-[200px]">
            PNG, JPG, WEBP or GIF. Max 8&nbsp;MB. Saved instantly to your site.
          </p>
        </div>
      </div>
    </div>
  );
}
