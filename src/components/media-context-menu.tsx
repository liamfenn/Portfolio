"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { InspectableText } from "@/components/design-inspector";

export function MediaContextMenu({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [prepared, setPrepared] = useState<{ loading: boolean; file: File | null }>({ loading: true, file: null });
  const [status, setStatus] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { dialog?.close(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const prepare = async () => {
      if (!navigator.share || !navigator.canShare) return null;
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) return null;
        const blob = await response.blob();
        const filename = new URL(url, window.location.href).pathname.split("/").pop() || "media";
        const file = new File([blob], filename, { type: blob.type });
        return navigator.canShare({ files: [file] }) ? file : null;
      } catch { return null; }
    };
    // Prepare the file before the button press: iOS sharing needs fresh user activation.
    void prepare().then(file => { if (!controller.signal.aborted) setPrepared({ loading: false, file }); });
    return () => controller.abort();
  }, [url]);

  const share = () => {
    const data = prepared.file ? { title, files: [prepared.file] } : { title, url };
    void navigator.share(data).then(onClose).catch(error => {
      if ((error as DOMException).name !== "AbortError") setStatus("Couldn’t share. Try copying the link.");
    });
  };
  const copy = () => {
    void navigator.clipboard.writeText(url).then(() => setStatus("Link copied.")).catch(() => setStatus("Couldn’t copy the link."));
  };

  return createPortal(<dialog ref={dialogRef} className="media-menu text-captionSans" aria-label={`${title} media options`}
    onCancel={event => { event.preventDefault(); onClose(); }} onClose={onClose}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
    }}>
    <h2><InspectableText>{title}</InspectableText></h2>
    {typeof navigator.share === "function" && <button type="button" disabled={prepared.loading} onClick={share}>
      <InspectableText>{prepared.loading ? "Preparing media…" : prepared.file ? "Share / Save media" : "Share link"}</InspectableText>
    </button>}
    <button type="button" onClick={copy}><InspectableText>Copy media link</InspectableText></button>
    <button type="button" onClick={onClose}><InspectableText>Cancel</InspectableText></button>
    {status && <p className="text-secondary" role="status"><InspectableText>{status}</InspectableText></p>}
  </dialog>, document.body);
}
