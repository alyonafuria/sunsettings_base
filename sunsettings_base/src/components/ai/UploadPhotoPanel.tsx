"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import ImageCard from "@/components/ui/image-card"
import { Slider } from "@/components/ui/slider"

export default function UploadPhotoPanel({
  locationLabel,
  coords,
  scoreLabel,
  scorePercent,
  onUploadingChange,
  onUploaded,
  onReset,
  onOpenPicker,
}: {
  locationLabel: string
  coords?: { lat?: number; lon?: number }
  scoreLabel?: string
  scorePercent?: number
  onUploadingChange?: (uploading: boolean) => void
  onUploaded?: (cid: string) => void
  onReset?: () => void
  onOpenPicker?: () => void
}) {
  const [file, setFile] = React.useState<File | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [photoCid, setPhotoCid] = React.useState<string | null>(null)
  const [metaCid, setMetaCid] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [userDecision, setUserDecision] = React.useState<"yes" | "no" | null>(null)
  const [userScore, setUserScore] = React.useState<number | null>(null)

  const resetUpload = () => {
    setFile(null)
    setPhotoCid(null)
    setMetaCid(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    onReset?.()
    // Immediately open the picker again
    onOpenPicker?.()
    // Defer to ensure input value reset is applied before opening
    setTimeout(() => {
      fileInputRef.current?.click()
    }, 0)
  }

  // File input change handler (hoisted)
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null
    setFile(f)
    // create local preview
    if (f) {
      const url = URL.createObjectURL(f)
      setPreviewUrl(url)
      // default: wait for user decision; reset prior choices
      setUserDecision(null)
      setUserScore(null)
      // reset any previous slider state
    } else {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      setUserDecision(null)
      setUserScore(null)
    }
  }

  // No file chosen yet: show only a centered "Add photo" button (no Card wrapper)
  if (!file && !photoCid) {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
        <div className="w-full flex justify-center mx-auto">
          <Button
            type="button"
            variant="neutral"
            onClick={() => {
              onOpenPicker?.()
              fileInputRef.current?.click()
            }}
            disabled={uploading}
          >
            Add photo
          </Button>
        </div>
        {error && <div className="text-xs text-center">{error}</div>}
      </>
    )
  }

  // When a file is chosen, show just the image card-style figure with caption below it (no parent Card wrapper)
  if (file && previewUrl) {
    return (
      <>
        <figure className="mx-auto w-[300px] overflow-hidden rounded-base border-2 border-border bg-background font-base shadow-shadow">
          <div className="relative">
            <img src={previewUrl} alt="preview" className="w-full aspect-4/3 object-cover" />
            {locationLabel && (
              <div className="absolute top-2 left-2 text-[11px] px-2 py-1 bg-white text-black border-2 border-black">
                {locationLabel}
              </div>
            )}
          </div>
          <figcaption className="border-t-2 text-main-foreground border-border p-4">
            {typeof scorePercent === "number" && (
              <div className="text-center space-y-2">
                <div className="text-sm">Agree with the score?</div>
                <div className="flex justify-center gap-2">
                  <Button
                    type="button"
                    variant={userDecision === "yes" ? "default" : "neutral"}
                    onClick={() => {
                      setUserDecision("yes")
                      setUserScore(scorePercent ?? null)
                    }}
                  >
                    Yes
                  </Button>
                  <Button
                    type="button"
                    variant={userDecision === "no" ? "default" : "neutral"}
                    onClick={() => {
                      setUserDecision("no")
                      setUserScore(null)
                      // no-op
                    }}
                  >
                    No
                  </Button>
                </div>

                {userDecision === "no" && (
                  <div className="pt-1">
                    <div className="text-xs mb-1 opacity-80">Adjust your score</div>
                    <Slider
                      defaultValue={[typeof scorePercent === "number" ? scorePercent : 50]}
                      max={100}
                      step={1}
                      onValueChange={(vals) => {
                        setUserScore(vals?.[0] ?? null)
                        // no-op
                      }}
                    />
                    <div className="mt-1 text-xs">Your score: {typeof userScore === "number" ? `${userScore}%` : "—"}</div>
                  </div>
                )}
                <div className="pt-2 flex justify-center">
                  <Button type="button" onClick={onUpload} disabled={!file || uploading || (typeof scorePercent === "number" ? userScore === null : false)}>
                    {uploading ? "Submitting…" : "Submit"}
                  </Button>
                </div>
              </div>
            )}
          </figcaption>
        </figure>
        {error && <div className="text-xs">{error}</div>}
      </>
    )
  }

  

  async function onUpload() {
    if (!file) return
    setUploading(true)
    onUploadingChange?.(true)
    setError(null)
    try {
      // 1) upload file
      const fd = new FormData()
      fd.append("file", file)
      fd.append("name", `sunsettings_photo_${Date.now()}`)
      console.debug("[upload] sending file", { name: file.name, size: file.size, type: file.type })
      // pass score/location to server so it can be stored in Pinata metadata keyvalues
      if (typeof scorePercent === "number") fd.append("scorePercent", String(scorePercent))
      if (scoreLabel) fd.append("scoreLabel", scoreLabel)
      if (locationLabel) fd.append("locationLabel", locationLabel)
      if (typeof userScore === "number") fd.append("userScorePercent", String(userScore))
      const up = await fetch("/api/pinata/upload-file", { method: "POST", body: fd })
      type UploadFileResponse = { ok?: boolean; cid?: string; pinata?: Record<string, unknown>; error?: string }
      let upJson: UploadFileResponse | null = null
      let upText: string | null = null
      try {
        upJson = await up.json()
      } catch {
        try { upText = await up.text() } catch { upText = null }
      }
      if (!up.ok) {
        console.error("[upload] file upload failed", { status: up.status, json: upJson, text: upText?.slice(0, 500) })
        const msg = upJson?.error || upText || `File upload failed: ${up.status}`
        throw new Error(typeof msg === "string" ? msg : `File upload failed: ${up.status}`)
      }
      if (!upJson?.cid) throw new Error("No CID from file upload")
      setPhotoCid(upJson.cid)
      onUploaded?.(upJson.cid)

      // 2) upload metadata JSON
      const photoCreatedAt = file ? new Date(file.lastModified).toISOString() : null
      const metadata = {
        walletAddress: "", // TODO: fill when wallet integration is ready
        photoCid: upJson.cid,
        // flat fields requested
        locationLabel: locationLabel || "",
        sunsetScorePercent: typeof scorePercent === "number" ? scorePercent : null,
        sunsetScoreLabel: scoreLabel || null,
        userSunsetScorePercent: typeof userScore === "number" ? userScore : null,
        photoCreatedAt,
        // keep structured location too
        location: {
          label: locationLabel || "",
          lat: typeof coords?.lat === "number" ? coords?.lat : null,
          lon: typeof coords?.lon === "number" ? coords?.lon : null,
        },
        createdAt: new Date().toISOString(),
      }
      const meta = await fetch("/api/pinata/upload-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: metadata, name: `sunsettings_meta_${Date.now()}` }),
      })
      type UploadJsonResponse = { cid?: string; ok?: boolean; error?: string }
      let metaJson: UploadJsonResponse | null = null
      let metaText: string | null = null
      try {
        metaJson = await meta.json()
      } catch {
        try { metaText = await meta.text() } catch { metaText = null }
      }
      if (!meta.ok) {
        console.error("[upload] metadata upload failed", { status: meta.status, json: metaJson, text: metaText?.slice(0, 500) })
        const msg = metaJson?.error || metaText || `JSON upload failed: ${meta.status}`
        throw new Error(typeof msg === "string" ? msg : `JSON upload failed: ${meta.status}`)
      }
      if (!metaJson?.cid) throw new Error("No CID from JSON upload")
      setMetaCid(metaJson.cid)
      // Clear local selection so we switch to the post-upload view
      if (previewUrl) {
        try { URL.revokeObjectURL(previewUrl) } catch {}
      }
      setPreviewUrl(null)
      setFile(null)
      setUserDecision(null)
      setUserScore(null)
    } catch (e) {
      setError((e as Error)?.message || "Upload failed")
    } finally {
      setUploading(false)
      onUploadingChange?.(false)
    }
  }

  if (photoCid) {
    const imgUrl = `https://gateway.pinata.cloud/ipfs/${photoCid}`
    return (
      <div className="mx-auto flex flex-col items-center gap-3">
        <ImageCard imageUrl={imgUrl} caption={"Photo uploaded successfully"} />
        <Button type="button" onClick={resetUpload}>Upload new photo</Button>
        {error && <div className="text-xs">{error}</div>}
      </div>
    )
  }

  return null
}
