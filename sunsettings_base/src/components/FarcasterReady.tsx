"use client"

import { useEffect } from "react"
import { sdk } from "@farcaster/miniapp-sdk"

export default function FarcasterReady() {
  useEffect(() => {
    try { sdk.actions.ready() } catch {}
  }, [])
  return null
}
