"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import Image from "next/image"
import { HelpCircle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { parseGpsFromFile, parseTakenAtFromFile } from "@/lib/exif"
import { toH3, centerOf, DEFAULT_H3_RES } from "@/lib/h3"

export default function UploadPhotoPanel({
  locationLabel,
  scoreLabel,
  scorePercent,
  onUploadingChange,
  onUploaded,
  onReset,
  onOpenPicker,
  onCloseRequested,
}: {
  locationLabel: string
  coords?: { lat?: number; lon?: number }
  scoreLabel?: string
  scorePercent?: number
  onUploadingChange?: (uploading: boolean) => void
  onUploaded?: (cid: string) => void
  onReset?: () => void
  onOpenPicker?: () => void
  onCloseRequested?: () => void
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
  const [photoH3Index, setPhotoH3Index] = React.useState<string | null>(null)
  const [photoCellCenter, setPhotoCellCenter] = React.useState<{ lat: number; lon: number } | null>(null)
  const [photoLocationLabel, setPhotoLocationLabel] = React.useState<string | null>(null)
  const [labelLoading, setLabelLoading] = React.useState(false)
  const [takenAtIso, setTakenAtIso] = React.useState<string | null>(null)
  const [exifDialogDismissed, setExifDialogDismissed] = React.useState(false)

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

  const closePanel = () => {
    if (previewUrl) {
      try {
        URL.revokeObjectURL(previewUrl)
      } catch {}
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
    setPreviewUrl(null)
    setFile(null)
    setPhotoCid(null)
    setMetaCid(null)
    setUserDecision(null)
    setUserScore(null)
    // ensure all derived state is reset so a future photo starts clean
    setPhotoH3Index(null)
    setPhotoCellCenter(null)
    setPhotoLocationLabel(null)
    setTakenAtIso(null)
    setLabelLoading(false)
    setExifDialogDismissed(false)
    onCloseRequested?.()
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
      // derive photo location from EXIF -> H3 -> reverse geocode
      ;(async () => {
        setPhotoH3Index(null)
        setPhotoCellCenter(null)
        setPhotoLocationLabel(null)
        setTakenAtIso(null)
        try {
          const [gps, taken] = await Promise.all([
            parseGpsFromFile(f),
            parseTakenAtFromFile(f),
          ])
          if (taken) setTakenAtIso(taken)
          if (gps) {
            const h3 = toH3(gps.lat, gps.lon, DEFAULT_H3_RES)
            const center = centerOf(h3)
            setPhotoH3Index(h3)
            setPhotoCellCenter(center)
            // Notify map to show a temporary preview pin immediately (before reverse geocode)
            try {
              window.dispatchEvent(new CustomEvent("sunsettings:photoPreview", {
                detail: {
                  lat: center.lat,
                  lon: center.lon,
                  locationLabel: null,
                  takenAtIso: takenAtIso ?? null,
                  previewUrl: url,
                }
              }))
            } catch {}
            // reverse geocode center via our API
            setLabelLoading(true)
            try {
              const res = await fetch("/api/geocode/reverse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lat: center.lat, lon: center.lon }),
              })
              if (res.ok) {
                const data = await res.json()
                if (data?.label) setPhotoLocationLabel(data.label)
                else setPhotoLocationLabel(null)
              } else {
                setPhotoLocationLabel(null)
              }
            } finally {
              setLabelLoading(false)
            }
            // Optionally send an update with resolved label (non-critical)
            try {
              window.dispatchEvent(new CustomEvent("sunsettings:photoPreview", {
                detail: {
                  lat: center.lat,
                  lon: center.lon,
                  locationLabel: photoLocationLabel ?? null,
                  takenAtIso: takenAtIso ?? null,
                  previewUrl: url,
                }
              }))
            } catch {}
          } else {
            setPhotoLocationLabel(null)
          }
        } catch {
          setPhotoLocationLabel(null)
        }
      })()
    } else {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      setUserDecision(null)
      setUserScore(null)
      setPhotoH3Index(null)
      setPhotoCellCenter(null)
      setPhotoLocationLabel(null)
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
            <span>Add photo</span>
          </Button>
        </div>
        {error && <div className="text-xs text-center">{error}</div>}
      </>
    )
  }

  // File chosen or uploaded: show Card wrapper with image (preview or uploaded), caption, and badge
  if (file || photoCid) {
    const imgUrl = photoCid ? `https://tan-mad-gorilla-689.mypinata.cloud/ipfs/${photoCid}` : null
    const imageSrc = photoCid ? imgUrl! : (previewUrl || "")
    const unoptimized = true
    const hasExif = Boolean(photoH3Index)
    const displayLabel = hasExif
      ? (photoLocationLabel || (labelLoading ? "Resolving location…" : null))
      : (labelLoading ? "Resolving location…" : "Can't read photo location")
    return (
      <div className="mx-auto flex flex-col items-center gap-3">
        <figure className="w-[300px] overflow-hidden rounded-base border-2 border-border bg-background font-base shadow-shadow">
          <div className="relative">
            <div className="relative w-full aspect-[4/3]">
              <Image src={imageSrc} alt={photoCid ? "uploaded" : "preview"} fill sizes="300px" className="object-cover" unoptimized={unoptimized} />
            </div>
            {displayLabel && (
              hasExif ? (
                <div className="absolute top-2 left-2 text-[11px] px-2 py-1 bg-white text-black border-2 border-black">
                  {displayLabel}
                </div>
              ) : (
                <div className="absolute top-2 left-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="flex items-center gap-1 text-[11px] px-2 py-1 bg-white text-black border-2 border-black">
                        <span>{displayLabel}</span>
                        <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Why we can&apos;t read photo location</AlertDialogTitle>
                        <AlertDialogDescription>
                          We couldn&apos;t find GPS EXIF data in your photo. This can happen if:
                          <br />
                          • The image was edited or exported and EXIF was removed.
                          <br />
                          • The photo is a screenshot (screenshots have no EXIF).
                          <br />
                          • Messaging apps removed metadata when sharing.
                          <br />
                          • Camera location services were disabled.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setExifDialogDismissed(true)}>Close</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { setExifDialogDismissed(false); resetUpload() }}>Upload new photo</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )
            )}
          </div>
          <figcaption className="border-t-2 text-main-foreground border-border p-4">
              {uploading ? (
                <div className="text-center py-2">
                  <div className="text-sm">Uploading…</div>
                </div>
              ) : metaCid ? (
                <div className="text-center py-2">
                  <div className="text-sm">Photo uploaded successfully</div>
                </div>
              ) : (
                typeof scorePercent === "number" && (
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
                        disabled={uploading}
                      >
                        <span>Yes</span>
                      </Button>
                      <Button
                        type="button"
                        variant={userDecision === "no" ? "default" : "neutral"}
                        onClick={() => {
                          setUserDecision("no")
                          setUserScore(null)
                          // no-op
                        }}
                        disabled={uploading}
                      >
                        <span>No</span>
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
                          // slider stays interactive until submit
                        />
                        <div className="mt-1 text-xs">Your score: {typeof userScore === "number" ? `${userScore}%` : "—"}</div>
                      </div>
                    )}
                    <div className="pt-2 flex justify-center gap-2">
                      <Button
                        type="button"
                        onClick={onUpload}
                        disabled={!file || uploading || (typeof scorePercent === "number" ? userScore === null : false)}
                      >
                        {uploading ? "Submitting…" : "Submit"}
                      </Button>
                      {!uploading && (
                        <Button
                          type="button"
                          variant="neutral"
                          onClick={closePanel}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                )
              )}
            </figcaption>
          </figure>
          {error && <div className="text-xs">{error}</div>}
          {photoCid && (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" onClick={resetUpload}>Add another photo</Button>
              <Button type="button" variant="neutral" onClick={closePanel}>Close</Button>
            </div>
          )}
        </div>
    )
  }

  // Upload handler
  async function onUpload() {
    if (!file) return
    setUploading(true)
    onUploadingChange?.(true)
    setError(null)
    try {
      // 1) upload file
      const fd = new FormData()
      fd.append("file", file)
      // build a descriptive name: sunsettings_photo_<takenAt>_<h3index or noh3>.<ext>
      const fallbackTaken = new Date(file.lastModified).toISOString()
      const taken = takenAtIso || fallbackTaken
      const safeTaken = taken.replace(/[:.]/g, "-")
      // derive extension from MIME or original filename; default to .jpg
      const mime = (file.type || "").toLowerCase()
      const extFromMime =
        mime === "image/jpeg" ? ".jpg" :
        mime === "image/png" ? ".png" :
        mime === "image/webp" ? ".webp" :
        mime === "image/heic" ? ".heic" :
        mime === "image/heif" ? ".heif" :
        mime === "image/tiff" ? ".tiff" :
        ""
      const extFromName = (() => {
        const m = /\.([a-z0-9]{2,5})$/i.exec(file.name || "")
        return m ? `.${m[1].toLowerCase()}` : ""
      })()
      const photoExt = extFromMime || extFromName || ".jpg"
      const photoName = `sunsettings_photo_${safeTaken}_${photoH3Index || "noh3"}${photoExt}`
      fd.append("name", photoName)
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

      let existingMetaCid: string | null = null
      try {
        const lookupRes = await fetch(`/api/photos?photoCid=${encodeURIComponent(upJson.cid)}`, { cache: "no-store" })
        if (lookupRes.ok) {
          const lookupJson = await lookupRes.json().catch(() => null)
          const existing = Array.isArray(lookupJson?.items) ? lookupJson.items[0] : null
          if (existing && typeof existing.metadataCid === "string") {
            existingMetaCid = existing.metadataCid
          }
        }
      } catch {
        existingMetaCid = null
      }

      if (existingMetaCid) {
        setMetaCid(existingMetaCid)
        try {
          window.dispatchEvent(new CustomEvent("sunsettings:photoUploaded", {
            detail: {
              photoCid: upJson.cid,
              metadataCid: existingMetaCid,
              lat: photoCellCenter?.lat ?? null,
              lon: photoCellCenter?.lon ?? null,
              locationLabel: photoLocationLabel ?? null,
              takenAtIso: takenAtIso ?? null,
              previewUrl: previewUrl || null,
            }
          }))
        } catch {}
      } else {
        // upload metadata JSON exactly once when none exists yet
        const photoCreatedAt = file ? new Date(file.lastModified).toISOString() : null
        const hasExifNow = Boolean(photoH3Index)
        const locationLabelForMeta = hasExifNow
          ? (photoLocationLabel || null)
          : (exifDialogDismissed ? "" : null)
        const metadata = {
          walletAddress: "", // TODO: fill when wallet integration is ready
          photoCid: upJson.cid,
          photoLocationLabel: locationLabelForMeta,
          photoH3Index: photoH3Index || null,
          photoCellCenterLat: photoCellCenter?.lat ?? null,
          photoCellCenterLon: photoCellCenter?.lon ?? null,
          sunsetScorePercent: typeof scorePercent === "number" ? scorePercent : null,
          sunsetScoreLabel: scoreLabel || null,
          userSunsetScorePercent: typeof userScore === "number" ? userScore : null,
          photoCreatedAt,
        }
        const metaName = `sunsettings_meta_${safeTaken}_${photoH3Index || "noh3"}_${upJson.cid}`
        const meta = await fetch("/api/pinata/upload-json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: metadata, name: metaName }),
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
        try {
          window.dispatchEvent(new CustomEvent("sunsettings:photoUploaded", {
            detail: {
              photoCid: upJson.cid,
              metadataCid: metaJson.cid,
              lat: photoCellCenter?.lat ?? null,
              lon: photoCellCenter?.lon ?? null,
              locationLabel: photoLocationLabel ?? null,
              takenAtIso: takenAtIso ?? null,
              previewUrl: previewUrl || null,
            }
          }))
        } catch {}
      }
      // Delay revoking previewUrl so map can use it briefly for the optimistic marker
      if (previewUrl) {
        const urlToRevoke = previewUrl
        setTimeout(() => { try { URL.revokeObjectURL(urlToRevoke) } catch {} }, 20000)
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

  return null
}
