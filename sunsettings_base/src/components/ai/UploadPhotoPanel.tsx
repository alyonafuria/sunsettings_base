"use client";

import * as React from "react";
import { useAccount, useConnect } from "wagmi";
import type { Abi } from "viem";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import Image from "next/image";
import { HelpCircle } from "lucide-react";
import {
  Transaction,
  TransactionButton,
  TransactionStatus,
  TransactionStatusAction,
  TransactionStatusLabel,
} from "@coinbase/onchainkit/transaction";
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
} from "@/components/ui/alert-dialog";
import { toH3, centerOf, DEFAULT_H3_RES } from "@/lib/h3";
import { getPreferredLocation } from "@/lib/location";

export default function UploadPhotoPanel({
  locationLabel,
  scoreLabel,
  scorePercent,
  onUploadingChange,
  onUploaded,
  onReset,
  onOpenPicker,
  onCloseRequested,
  coords,
  onLocationMismatchChange,
}: {
  locationLabel: string;
  scoreLabel?: string;
  scorePercent?: number;
  onUploadingChange?: (uploading: boolean) => void;
  onUploaded?: (cid: string) => void;
  onReset?: () => void;
  onOpenPicker?: () => void;
  onCloseRequested?: () => void;
  coords?: { lat?: number; lon?: number };
  onLocationMismatchChange?: (mismatch: boolean) => void;
}) {
  const { address: connectedAddress, isConnected } = useAccount();
  const currentChainId = 8453;
  const { connectors, connectAsync, status: connectStatus } = useConnect();
  const connectCoinbase = async () => {
    try {
      const coinbase = connectors.find((c) => /coinbase/i.test(c.name));
      await connectAsync({ connector: coinbase ?? connectors[0] });
    } catch {}
  };
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [photoCid, setPhotoCid] = React.useState<string | null>(null);
  const [metaCid, setMetaCid] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [disagree, setDisagree] = React.useState(false);
  const [userScore, setUserScore] = React.useState<number | null>(null);
  const [photoH3Index, setPhotoH3Index] = React.useState<string | null>(null);
  const [photoCellCenter, setPhotoCellCenter] = React.useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [photoLocationLabel, setPhotoLocationLabel] = React.useState<
    string | null
  >(null);
  const [labelLoading, setLabelLoading] = React.useState(false);
  const [takenAtIso, setTakenAtIso] = React.useState<string | null>(null);
  const [isMobile, setIsMobile] = React.useState(false);
  const [gpsFix, setGpsFix] = React.useState<{
    lat: number;
    lon: number;
    accuracy?: number;
    fixAtIso: string;
  } | null>(null);
  // Removed pre-capture detect flow; we still keep gpsFix for compatibility if set elsewhere
  const [geoLoading, setGeoLoading] = React.useState(false);
  const [geoError, setGeoError] = React.useState<string | null>(null);
  const geoLockRef = React.useRef(false);
  const [geoDenied, setGeoDenied] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem("geo_denied") === "1";
    } catch {
      return false;
    }
  });
  type PermissionQueryResult = { state: PermissionState };
  type NavigatorWithPermissions = Navigator & {
    permissions?: { query?: (args: { name: PermissionName }) => Promise<PermissionQueryResult> };
  };
  type GeoErr = { code?: number; message?: string };
  const getGeoPermissionState = React.useCallback(async (): Promise<"granted" | "denied" | "prompt" | "unknown"> => {
    try {
      const n = navigator as NavigatorWithPermissions;
      if (!n?.permissions?.query) return "unknown";
      const res = await n.permissions.query({ name: "geolocation" as PermissionName });
      const s = res?.state ?? "unknown";
      if (s === "granted" || s === "denied" || s === "prompt") return s;
      return "unknown";
    } catch {
      return "unknown";
    }
  }, []);
  const [deviceId, setDeviceId] = React.useState<string | null>(null);
  const [captureTimestamp, setCaptureTimestamp] = React.useState<string | null>(
    null
  );
  const [prehashSha256, setPrehashSha256] = React.useState<string | null>(null);
  const [locationMismatch, setLocationMismatch] = React.useState(false);

  const resetUpload = () => {
    setFile(null);
    setPhotoCid(null);
    setMetaCid(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onReset?.();
    // Immediately open the picker again
    onOpenPicker?.();
    // Defer to ensure input value reset is applied before opening
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  };

  // Re-evaluate mismatch when both gpsFix and analysis coords are present; do not auto-clear otherwise
  React.useEffect(() => {
    try {
      const COARSE_RES = 4;
      const analysisLat = coords?.lat;
      const analysisLon = coords?.lon;
      if (
        gpsFix &&
        typeof analysisLat === "number" &&
        typeof analysisLon === "number"
      ) {
        const a = toH3(analysisLat, analysisLon, COARSE_RES);
        const p = toH3(gpsFix.lat, gpsFix.lon, COARSE_RES);
        const mismatchNow = a !== p;
        if (mismatchNow !== locationMismatch) {
          setLocationMismatch(mismatchNow);
          onLocationMismatchChange?.(mismatchNow);
        }
      }
      // If either value is missing, leave current mismatch state unchanged
    } catch {
      // ignore
    }
  }, [gpsFix, coords?.lat, coords?.lon, locationMismatch, onLocationMismatchChange]);

  const closePanel = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPreviewUrl(null);
    setFile(null);
    setPhotoCid(null);
    setMetaCid(null);
    setDisagree(false);
    setUserScore(null);
    // ensure all derived state is reset so a future photo starts clean
    setPhotoH3Index(null);
    setPhotoCellCenter(null);
    setPhotoLocationLabel(null);
    setTakenAtIso(null);
    setLabelLoading(false);
    onCloseRequested?.();
  };

  React.useEffect(() => {
    try {
      const ua =
        typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
      const coarse =
        typeof window !== "undefined" && typeof window.matchMedia === "function"
          ? window.matchMedia("(pointer: coarse)").matches
          : false;
      const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua) || coarse;
      setIsMobile(mobile);
    } catch {
      setIsMobile(false);
    }
  }, []);

  // Keep user score in sync with the checkbox
  React.useEffect(() => {
    if (disagree) {
      setUserScore(null);
    } else {
      setUserScore(typeof scorePercent === "number" ? scorePercent : null);
    }
  }, [disagree, scorePercent]);

  React.useEffect(() => {
    try {
      const existing =
        typeof localStorage !== "undefined"
          ? localStorage.getItem("sunsettings_device_id")
          : null;
      if (existing) setDeviceId(existing);
      else {
        const id =
          typeof crypto !== "undefined" &&
          typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Math.random().toString(36).slice(2)}${Date.now().toString(
                36
              )}`;
        setDeviceId(id);
        try {
          localStorage.setItem("sunsettings_device_id", id);
        } catch {}
      }
    } catch {}
  }, []);

  async function detectLocation() {
    if (gpsFix) return;
    if (geoLockRef.current) return;
    geoLockRef.current = true;
    setGpsError(null);
    setGpsFixing(true);
    try {
      const pref = await getPreferredLocation();
      const lat = pref.lat;
      const lon = pref.lon;
      const accuracy = undefined;
      const fixAtIso = new Date().toISOString();
      setGpsFix({ lat, lon, accuracy, fixAtIso });
      // Immediately set H3/center and resolve label for map & metadata
      try {
        const h3 = toH3(lat, lon, DEFAULT_H3_RES);
        const center = centerOf(h3);
        setPhotoH3Index(h3);
        setPhotoCellCenter(center);
        if (pref.source === "ip") {
          setGpsError("Using coarse IP-based location (enable Location in Settings for precision)");
        }
        // Evaluate location mismatch at a coarse H3 resolution (state/region scale)
        try {
          const COARSE_RES = 4;
          const analysisLat = coords?.lat;
          const analysisLon = coords?.lon;
          if (
            typeof analysisLat === "number" &&
            typeof analysisLon === "number"
          ) {
            const a = toH3(analysisLat, analysisLon, COARSE_RES);
            const p = toH3(lat, lon, COARSE_RES);
            const mismatchNow = a !== p;
            setLocationMismatch(mismatchNow);
            onLocationMismatchChange?.(mismatchNow);
          } else {
            setLocationMismatch(false);
            onLocationMismatchChange?.(false);
          }
        } catch {
          setLocationMismatch(false);
          onLocationMismatchChange?.(false);
        }
        setLabelLoading(true);
        try {
          const res = await fetch("/api/geocode/reverse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: center.lat, lon: center.lon }),
          });
          if (res.ok) {
            const data = await res.json();
            setPhotoLocationLabel(
              typeof data?.label === "string" && data.label.trim().length
                ? data.label
                : `${center.lat.toFixed(5)}, ${center.lon.toFixed(5)}`
            );
          } else {
            setPhotoLocationLabel(
              `${center.lat.toFixed(5)}, ${center.lon.toFixed(5)}`
            );
          }
        } finally {
          setLabelLoading(false);
        }
      } catch {
        // if H3 fails for any reason, still provide a fallback label from raw lat/lon
        setPhotoLocationLabel(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
      }
    } catch (e) {
      const msg = (e as GeolocationPositionError)?.message || (e as Error)?.message || "Location failed";
      setGpsError(msg);
      const code = (e as GeoErr)?.code;
      if (code === 1 || /denied/i.test(String(msg))) {
        try { sessionStorage.setItem("geo_denied", "1"); } catch {}
        setGeoDenied(true);
        // Try IP fallback
        try {
          const res = await fetch("/api/geo/ip", { cache: "no-store" });
          if (res.ok) {
            const j = await res.json();
            const lat = Number(j?.lat);
            const lon = Number(j?.lon);
            if (Number.isFinite(lat) && Number.isFinite(lon)) {
              try {
                const h3 = toH3(lat, lon, DEFAULT_H3_RES);
                const center = centerOf(h3);
                setPhotoH3Index(h3);
                setPhotoCellCenter(center);
                const label = typeof j?.label === "string" && j.label.trim().length
                  ? j.label
                  : `${center.lat.toFixed(5)}, ${center.lon.toFixed(5)}`;
                setPhotoLocationLabel(label);
                try {
                  window.dispatchEvent(
                    new CustomEvent("sunsettings:photoPreview", {
                      detail: {
                        lat: center.lat,
                        lon: center.lon,
                        locationLabel: label,
                        takenAtIso: takenAtIso ?? null,
                        previewUrl: previewUrl || null,
                      },
                    })
                  );
                } catch {}
                setGpsError("Using coarse IP-based location (enable Location in Settings for precision)");
              } catch {}
            }
          }
        } catch {}
      }
      setGpsFix(null);
    } finally {
      setGpsFixing(false);
      geoLockRef.current = false;
    }
  }

  // File input change handler (hoisted)
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    // create local preview
    if (f) {
      const url = URL.createObjectURL(f);
      setPreviewUrl(url);
      setCaptureTimestamp(new Date().toISOString());
      // default: agree with the score; reset checkbox and set initial userScore
      setDisagree(false);
      setUserScore(typeof scorePercent === "number" ? scorePercent : null);
      // compute prehash and set takenAt from captureTimestamp or file's lastModified; do NOT clear pre-captured location
      (async () => {
        // Compute prehash immediately using file bytes + gps fix + capture timestamp
        try {
          const capIso = captureTimestamp || new Date().toISOString();
          const gps = gpsFix;
          const buf = await f.arrayBuffer();
          const metaObj = {
            lat: gps?.lat ?? null,
            lon: gps?.lon ?? null,
            accuracy: gps?.accuracy ?? null,
            gpsFixAtIso: gps?.fixAtIso ?? null,
            captureTimestamp: capIso,
          };
          const enc = new TextEncoder();
          const metaBytes = enc.encode(JSON.stringify(metaObj));
          const all = new Uint8Array(buf.byteLength + metaBytes.byteLength);
          all.set(new Uint8Array(buf), 0);
          all.set(metaBytes, new Uint8Array(buf).length);
          const digest = await crypto.subtle.digest("SHA-256", all);
          const hex = Array.from(new Uint8Array(digest))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          setPrehashSha256(hex);
        } catch {
          setPrehashSha256(null);
        }
        // takenAtIso: prefer captureTimestamp; fallback to file lastModified
        const fallbackTaken = new Date(f.lastModified).toISOString();
        setTakenAtIso(captureTimestamp || fallbackTaken);
      })();
    } else {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setDisagree(false);
      setUserScore(null);
    }
  }

  if (!file && !photoCid) {
    if (!isMobile) return null;
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onFileChange}
        />
        <div className="w-full flex flex-col items-center gap-2 mx-auto">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="neutral"
              onClick={async () => {
                setGeoError(null);
                setGeoLoading(true);
                try {
                  if (!navigator.geolocation) {
                    throw new Error("Geolocation not available");
                  }
                  const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                      enableHighAccuracy: true,
                      timeout: 10000,
                      maximumAge: 0,
                    });
                  });
                  const lat = pos.coords.latitude;
                  const lon = pos.coords.longitude;
                  const accuracy = pos.coords.accuracy;
                  const fixAtIso = new Date().toISOString();
                  // Compare with analysis coords at a coarse H3 resolution
                  try {
                    const COARSE_RES = 4;
                    const analysisLat = coords?.lat;
                    const analysisLon = coords?.lon;
                    if (typeof analysisLat === "number" && typeof analysisLon === "number") {
                      const a = toH3(analysisLat, analysisLon, COARSE_RES);
                      const p = toH3(lat, lon, COARSE_RES);
                      const mismatchNow = a !== p;
                      setLocationMismatch(mismatchNow);
                      onLocationMismatchChange?.(mismatchNow);
                      if (mismatchNow) {
                        return; // Do not open the camera
                      }
                    }
                  } catch {}
                  // Set gps fix for metadata/prehash and optionally precompute photo cell
                  setGpsFix({ lat, lon, accuracy, fixAtIso });
                  try {
                    const h3 = toH3(lat, lon, DEFAULT_H3_RES);
                    const center = centerOf(h3);
                    setPhotoH3Index(h3);
                    setPhotoCellCenter(center);
                  } catch {}
                  // Proceed to open camera
                  onOpenPicker?.();
                  setCaptureTimestamp(new Date().toISOString());
                  fileInputRef.current?.click();
                } catch (e) {
                  const msg = (e as GeolocationPositionError | Error)?.message || "Failed to get location";
                  setGeoError(msg);
                } finally {
                  setGeoLoading(false);
                }
              }}
              disabled={uploading || geoLoading}
            >
              <span>{geoLoading ? "Locating…" : "Take photo"}</span>
            </Button>
          </div>
          {geoError && <div className="text-xs text-center">{geoError}</div>}
          {error && <div className="text-xs text-center">{error}</div>}
        </div>
      </>
    );
  }

  // File chosen or uploaded: show Card wrapper with image (preview or uploaded), caption, and badge
  if (file || photoCid) {
    const imgUrl = photoCid
      ? `https://tan-mad-gorilla-689.mypinata.cloud/ipfs/${photoCid}`
      : null;
    const imageSrc = photoCid ? imgUrl! : previewUrl || "";
    const unoptimized = true;
    const hasExif = Boolean(photoH3Index);
    const displayLabel = hasExif
      ? photoLocationLabel || (labelLoading ? "Resolving location…" : null)
      : labelLoading
      ? "Resolving location…"
      : "Can't read photo location";
    return (
      <div className="mx-auto flex flex-col items-center gap-3">
        <figure className="relative w-[300px] overflow-hidden rounded-base border-2 border-border bg-background font-base shadow-shadow">
          <button
            aria-label="Close"
            onClick={closePanel}
            className="absolute right-2 top-2 z-10 h-8 w-8 bg-white text-black border-2 border-black flex items-center justify-center text-[22px] leading-none focus:outline-none"
          >
            ×
          </button>
          <div className="relative">
            <div className="relative w-full aspect-4/3">
              <Image
                src={imageSrc}
                alt={photoCid ? "uploaded" : "preview"}
                fill
                sizes="300px"
                className="object-cover"
                unoptimized={unoptimized}
              />
            </div>
            {displayLabel &&
              (hasExif ? (
                <div className="absolute top-2 left-2 text-[11px] px-2 py-1 bg-white text-black border-2 border-black">
                  {displayLabel}
                </div>
              ) : (
                <div className="absolute top-2 left-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="flex items-center gap-1 text-[11px] px-2 py-1 bg-white text-black border-2 border-black">
                        <span>{displayLabel}</span>
                        <HelpCircle
                          className="w-3.5 h-3.5"
                          aria-hidden="true"
                        />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Why we can&apos;t read photo location
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          We couldn&apos;t find GPS EXIF data in your photo.
                          This can happen if:
                          <br />
                          • The image was edited or exported and EXIF was
                          removed.
                          <br />
                          • The photo is a screenshot (screenshots have no
                          EXIF).
                          <br />
                          • Messaging apps removed metadata when sharing.
                          <br />• Camera location services were disabled.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Close</AlertDialogCancel>
                        <AlertDialogAction onClick={resetUpload}>
                          Upload new photo
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        setGeoError(null);
                        if (!navigator.geolocation) {
                          setGeoError("Geolocation not available");
                          return;
                        }
                        // Permissions preflight and session guard
                        try {
                          const state = await getGeoPermissionState();
                          const denied = state === "denied" || geoDenied;
                          if (denied) {
                            setGeoError("Location permission is blocked. Enable it in device Settings for the Base app and try again.");
                            return;
                          }
                        } catch {}
                        setGeoLoading(true);
                        try {
                          const pref = await getPreferredLocation();
                          const lat = pref.lat;
                          const lon = pref.lon;
                          const h3 = toH3(lat, lon, DEFAULT_H3_RES);
                          const center = centerOf(h3);
                          setPhotoH3Index(h3);
                          setPhotoCellCenter(center);
                          // Dispatch immediate preview at device location
                          try {
                            window.dispatchEvent(
                              new CustomEvent("sunsettings:photoPreview", {
                                detail: {
                                  lat: center.lat,
                                  lon: center.lon,
                                  locationLabel: null,
                                  takenAtIso: takenAtIso ?? null,
                                  previewUrl: previewUrl || null,
                                },
                              })
                            );
                          } catch {}
                          // Reverse geocode and update label
                          setLabelLoading(true);
                          try {
                            const res = await fetch("/api/geocode/reverse", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                lat: center.lat,
                                lon: center.lon,
                              }),
                            });
                            if (res.ok) {
                              const data = await res.json();
                              setPhotoLocationLabel(data?.label || null);
                              // Optional update event with label
                              try {
                                window.dispatchEvent(
                                  new CustomEvent("sunsettings:photoPreview", {
                                    detail: {
                                      lat: center.lat,
                                      lon: center.lon,
                                      locationLabel: data?.label || null,
                                      takenAtIso: takenAtIso ?? null,
                                      previewUrl: previewUrl || null,
                                    },
                                  })
                                );
                              } catch {}
                            } else {
                              setPhotoLocationLabel(null);
                            }
                          } finally {
                            setLabelLoading(false);
                          }
                        } catch (e) {
                          const msg = (e as GeolocationPositionError)?.message || "Failed to get location";
                          setGeoError(msg);
                          const code = (e as GeoErr)?.code;
                          if (code === 1 || /denied/i.test(String(msg))) {
                            try { sessionStorage.setItem("geo_denied", "1"); } catch {}
                            setGeoDenied(true);
                          }
                        } finally {
                          setGeoLoading(false);
                        }
                      }}
                      disabled={geoLoading}
                    >
                      {geoLoading ? "Locating…" : "Use my location"}
                    </Button>
                  </div>
                  {geoError && (
                    <div className="mt-1 text-[11px] text-red-600">
                      {geoError}
                    </div>
                  )}
                </div>
              ))}
          </div>
          <figcaption className="border-t-2 text-main-foreground border-border p-4">
            {uploading ? (
              <div className="text-center py-2">
                <div className="text-sm">Uploading…</div>
              </div>
            ) : metaCid ? (
              <div className="space-y-2">
                <div className="text-sm">Photo uploaded successfully</div>
                {/* Sponsored mint via Coinbase OnchainKit Paymaster */}
                {(() => {
                  const mintFn =
                    process.env.NEXT_PUBLIC_SUNSET_NFT_MINT_FUNCTION?.trim() ||
                    "safeMint";
                  const nftAddressSepolia = process.env
                    .NEXT_PUBLIC_SUNSET_SEPOLIA_NFT_CONTRACT_ADDRESS as
                    | string
                    | undefined;
                  const nftAddressBase = process.env
                    .NEXT_PUBLIC_SUNSET_BASE_NFT_CONTRACT_ADDRESS as
                    | string
                    | undefined;
                  const contractAddress =
                    currentChainId === 8453
                      ? nftAddressBase
                      : nftAddressSepolia;
                  const mintAbi = [
                    {
                      type: "function",
                      stateMutability: "nonpayable",
                      name: mintFn,
                      inputs: [
                        { name: "to", type: "address" },
                        { name: "tokenURI", type: "string" },
                      ],
                      outputs: [],
                    },
                  ] as const satisfies Abi;
                  if (!isConnected) {
                    return (
                      <div className="space-y-2">
                        <div className="text-xs opacity-80">
                          Connect your wallet to mint.
                        </div>
                        <Button size="sm" onClick={connectCoinbase}>
                          Connect wallet
                        </Button>
                      </div>
                    );
                  }
                  if (!contractAddress) {
                    const neededEnv =
                      currentChainId === 8453
                        ? "NEXT_PUBLIC_SUNSET_BASE_NFT_CONTRACT_ADDRESS"
                        : "NEXT_PUBLIC_SUNSET_SEPOLIA_NFT_CONTRACT_ADDRESS";
                    return (
                      <div className="text-xs opacity-80">
                        Missing contract env for this chain. Set{" "}
                        <code>{neededEnv}</code> in <code>.env</code> and
                        restart the app.
                      </div>
                    );
                  }
                  type ContractCall = {
                    address: `0x${string}`;
                    abi: Abi;
                    functionName: string;
                    args: [string | undefined, string];
                  };
                  const contracts: ContractCall[] = [
                    {
                      address: contractAddress as `0x${string}`,
                      abi: mintAbi,
                      functionName: mintFn,
                      args: [connectedAddress, `ipfs://${metaCid}`],
                    },
                  ];
                  return (
                    <Transaction
                      isSponsored
                      calls={contracts}
                      className="w-full"
                      chainId={currentChainId}
                    >
                      <TransactionButton
                        className="mt-0 mr-auto ml-auto w-full border-2 border-black"
                        text="Mint (gas covered)"
                      />
                      <TransactionStatus>
                        <TransactionStatusLabel />
                        <TransactionStatusAction />
                      </TransactionStatus>
                    </Transaction>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center space-y-2">
                {!isConnected && (
                  <div className="text-xs opacity-80">
                    You need to sign up / log in to submit a photo.
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm">Disagree with the score?</div>
                  <Switch
                    aria-label="Disagree with the score"
                    checked={disagree}
                    onCheckedChange={(v) => setDisagree(v)}
                    disabled={uploading}
                  />
                </div>

                {disagree && (
                  <div className="pt-1">
                    <div className="text-xs mb-1 opacity-80">
                      Adjust your score
                    </div>
                    <Slider
                      defaultValue={[
                        typeof scorePercent === "number" ? scorePercent : 50,
                      ]}
                      max={100}
                      step={1}
                      onValueChange={(vals) => {
                        setUserScore(vals?.[0] ?? null);
                      }}
                    />
                    <div className="mt-1 text-xs">
                      Your score:{" "}
                      {typeof userScore === "number" ? `${userScore}%` : "—"}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-center gap-2">
                  {isConnected ? (
                    <Button
                      type="button"
                      onClick={onUpload}
                      disabled={
                        !file ||
                        uploading ||
                        (typeof scorePercent === "number"
                          ? userScore === null
                          : false)
                      }
                    >
                      {uploading ? "Posting…" : "Post"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={connectCoinbase}
                      disabled={connectStatus === "pending"}
                    >
                      {connectStatus === "pending"
                        ? "Connecting…"
                        : "Sign up / Log in"}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </figcaption>
        </figure>
        {error && <div className="text-xs">{error}</div>}
        {photoCid && (
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" onClick={resetUpload}>
              Add another photo
            </Button>
            <Button type="button" variant="neutral" onClick={closePanel}>
              Close
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Upload handler
  async function onUpload() {
    if (!file) return;
    setUploading(true);
    onUploadingChange?.(true);
    setError(null);
    try {
      // 1) upload file
      const fd = new FormData();
      fd.append("file", file);
      // build a descriptive name: sunsettings_photo_<takenAt>_<h3index or noh3>.<ext>
      const fallbackTaken = new Date(file.lastModified).toISOString();
      const taken = takenAtIso || fallbackTaken;
      const safeTaken = taken.replace(/[:.]/g, "-");
      // derive extension from MIME or original filename; default to .jpg
      const mime = (file.type || "").toLowerCase();
      const extFromMime =
        mime === "image/jpeg"
          ? ".jpg"
          : mime === "image/png"
          ? ".png"
          : mime === "image/webp"
          ? ".webp"
          : mime === "image/heic"
          ? ".heic"
          : mime === "image/heif"
          ? ".heif"
          : mime === "image/tiff"
          ? ".tiff"
          : "";
      const extFromName = (() => {
        const m = /\.([a-z0-9]{2,5})$/i.exec(file.name || "");
        return m ? `.${m[1].toLowerCase()}` : "";
      })();
      const photoExt = extFromMime || extFromName || ".jpg";
      const photoName = `sunsettings_photo_${safeTaken}_${
        photoH3Index || "noh3"
      }${photoExt}`;
      fd.append("name", photoName);
      console.debug("[upload] sending file", {
        name: file.name,
        size: file.size,
        type: file.type,
      });
      // tamper-proof extras
      if (deviceId) fd.append("deviceId", deviceId);
      if (gpsFix?.lat != null) fd.append("gpsLat", String(gpsFix.lat));
      if (gpsFix?.lon != null) fd.append("gpsLon", String(gpsFix.lon));
      if (typeof gpsFix?.accuracy === "number")
        fd.append("gpsAccuracy", String(gpsFix.accuracy));
      if (gpsFix?.fixAtIso) fd.append("gpsFixAtIso", gpsFix.fixAtIso);
      if (captureTimestamp) fd.append("captureTimestamp", captureTimestamp);
      if (prehashSha256) fd.append("prehashSha256", prehashSha256);
      // pass score/location to server so it can be stored in Pinata metadata keyvalues
      if (typeof scorePercent === "number")
        fd.append("scorePercent", String(scorePercent));
      if (scoreLabel) fd.append("scoreLabel", scoreLabel);
      // Prefer the pre-capture detected label; fallback to analysis label prop
      const kvLabel = photoLocationLabel ?? locationLabel;
      if (kvLabel) fd.append("locationLabel", kvLabel);
      if (typeof userScore === "number")
        fd.append("userScorePercent", String(userScore));
      const up = await fetch("/api/pinata/upload-file", {
        method: "POST",
        body: fd,
      });
      type UploadFileResponse = {
        ok?: boolean;
        cid?: string;
        pinata?: Record<string, unknown>;
        error?: string;
      };
      let upJson: UploadFileResponse | null = null;
      let upText: string | null = null;
      try {
        upJson = await up.json();
      } catch {
        try {
          upText = await up.text();
        } catch {
          upText = null;
        }
      }
      if (!up.ok) {
        console.error("[upload] file upload failed", {
          status: up.status,
          json: upJson,
          text: upText?.slice(0, 500),
        });
        const msg =
          upJson?.error || upText || `File upload failed: ${up.status}`;
        throw new Error(
          typeof msg === "string" ? msg : `File upload failed: ${up.status}`
        );
      }
      if (!upJson?.cid) throw new Error("No CID from file upload");
      setPhotoCid(upJson.cid);
      onUploaded?.(upJson.cid);

      {
        const photoCreatedAt = file
          ? new Date(file.lastModified).toISOString()
          : null;
        // Determine location for metadata: prefer post-capture selected/derived H3;
        // fallback to any pre-capture gpsFix; otherwise fail gracefully.
        let h3: string | null = photoH3Index;
        let center: { lat: number; lon: number } | null = null;
        if (h3) {
          center = centerOf(h3);
        } else if (gpsFix?.lat != null && gpsFix?.lon != null) {
          h3 = toH3(gpsFix.lat, gpsFix.lon, DEFAULT_H3_RES);
          center = centerOf(h3);
        } else {
          throw new Error(
            "No location set. Please set location before submitting."
          );
        }
        const label =
          photoLocationLabel && photoLocationLabel.trim().length
            ? photoLocationLabel
            : `${center.lat.toFixed(3)}, ${center.lon.toFixed(3)}`;
        // ERC-721 compatible metadata JSON
        const shortId = (upJson.cid || "").slice(0, 8);
        const name = `sunsettings #${shortId}`;
        const attributes = [
          {
            trait_type: "sunsettings_score",
            value: typeof scorePercent === "number" ? scorePercent : null,
          },
          {
            trait_type: "user_score",
            value: typeof userScore === "number" ? userScore : null,
          },
          { trait_type: "location_label", value: label },
          { trait_type: "h3_index", value: h3 },
          {
            trait_type: "gps_accuracy_m",
            value:
              typeof gpsFix?.accuracy === "number" ? gpsFix.accuracy : null,
          },
          {
            trait_type: "captured_at",
            value: captureTimestamp || takenAtIso || photoCreatedAt || null,
          },
        ].filter((a) => a.value !== null && a.value !== undefined);

        const metadata = {
          name,
          description: "we provide access to basic miracles",
          external_url: "https://sunsettings.app",
          image: `ipfs://${upJson.cid}`,
          background_color: "000000",
          attributes,
          // Optional extra fields under a namespaced object
          properties: {
            photoLocationLabel: label,
            photoH3Index: h3,
            photoCellCenterLat: center.lat,
            photoCellCenterLon: center.lon,
            gpsSource: gpsFix ? "pre_capture" : "post_capture",
            deviceId: deviceId || "",
            gpsFixAtIso: gpsFix?.fixAtIso || "",
            captureTimestamp: captureTimestamp || "",
            prehashSha256: prehashSha256 || "",
            photoCreatedAt,
          },
        };
        const metaName = `sunsettings_meta_${safeTaken}_${
          photoH3Index || "noh3"
        }_${upJson.cid}`;
        const meta = await fetch("/api/pinata/upload-json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: metadata, name: metaName }),
        });
        type UploadJsonResponse = {
          cid?: string;
          ok?: boolean;
          error?: string;
        };
        let metaJson: UploadJsonResponse | null = null;
        let metaText: string | null = null;
        try {
          metaJson = await meta.json();
        } catch {
          try {
            metaText = await meta.text();
          } catch {
            metaText = null;
          }
        }
        if (!meta.ok) {
          console.error("[upload] metadata upload failed", {
            status: meta.status,
            json: metaJson,
            text: metaText?.slice(0, 500),
          });
          const msg =
            metaJson?.error || metaText || `JSON upload failed: ${meta.status}`;
          throw new Error(
            typeof msg === "string" ? msg : `JSON upload failed: ${meta.status}`
          );
        }
        if (!metaJson?.cid) throw new Error("No CID from JSON upload");
        setMetaCid(metaJson.cid);
        try {
          window.dispatchEvent(
            new CustomEvent("sunsettings:photoUploaded", {
              detail: {
                photoCid: upJson.cid,
                metadataCid: metaJson.cid,
                lat: photoCellCenter?.lat ?? null,
                lon: photoCellCenter?.lon ?? null,
                locationLabel: photoLocationLabel ?? null,
                takenAtIso: takenAtIso ?? null,
                previewUrl: previewUrl || null,
              },
            })
          );
        } catch {}
      }
      // Do not revoke previewUrl: map markers may still reference the blob URL. It will be GC'd when page unloads.
  setPreviewUrl(null);
  setFile(null);
  setDisagree(false);
  setUserScore(null);
    } catch (e) {
      setError((e as Error)?.message || "Upload failed");
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  }

  return null;
}
