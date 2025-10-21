"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAccount, useConnect, useDisconnect } from "wagmi"


function colorFromAddress(addr: string): string {
  // Simple hash -> HSL for a consistent but soft color
  let h = 0
  for (let i = 0; i < addr.length; i++) h = (h * 31 + addr.charCodeAt(i)) % 360
  return `hsl(${h} 70% 45%)`
}


function friendlyConnectorName(raw: string): string {
  const id = raw.toLowerCase()
  if (id.includes("coinbase")) return "Coinbase Wallet"
  if (id.includes("walletconnect")) return "WalletConnect"
  if (id.includes("injected")) return "Browser Wallet"
  return raw
}

export default function WalletStatus(): React.JSX.Element {
  const { address, isConnecting, isReconnecting } = useAccount()
  const { disconnectAsync, isPending: isDisconnecting } = useDisconnect()
  const { connectAsync, connectors, error: connectError, status } = useConnect()
  const [open, setOpen] = React.useState(false)
  const [localError, setLocalError] = React.useState<string | null>(null)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  const busy = isConnecting || isReconnecting || status === "pending"
  // Avoid SSR/client mismatch: only reflect busy state after mount
  const safeBusy = mounted ? busy : false
  const showConnected = mounted && Boolean(address)

  const handleConnect = async (connectorId?: string) => {
    const connector = connectors.find((c) => c.id === connectorId) ?? connectors[0]
    if (!connector) {
      setLocalError("No available wallet connectors")
      return
    }
    try {
      setLocalError(null)
      await connectAsync({ connector })
      setOpen(false)
    } catch (err) {
      setLocalError((err as Error)?.message || "Failed to connect wallet")
    }
  }

  const handleDisconnect = async () => {
    try {
      setLocalError(null)
      await disconnectAsync()
      setOpen(false)
    } catch (err) {
      setLocalError((err as Error)?.message || "Failed to disconnect")
    }
  }

  if (showConnected) {
    const addr = address as string
    const shortAddr = `${addr.slice(0, 4)}…${addr.slice(-2)}`
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="neutral"
          size="sm"
          onClick={handleDisconnect}
          disabled={isDisconnecting}
          aria-label={`Disconnect ${addr}`}
          title={`${addr}\nClick to disconnect`}
          className="group h-7 md:h-7 pl-1.5 pr-1.5 rounded-full shadow-sm border border-black/10 bg-white hover:bg-neutral-50 md:pl-1.5 md:pr-1.5"
        >
          <span
            aria-hidden
            className="mr-1 inline-block size-2 rounded-full ring-2 ring-black/10"
            style={{ backgroundColor: colorFromAddress(addr) }}
          />
          <span className="font-mono text-[10px] md:text-[11px] tracking-tight truncate max-w-[72px] md:max-w-[96px]">
            {shortAddr}
          </span>
        </Button>
        {(localError || connectError) && (
          <span className="text-[11px] text-red-500">
            {localError || connectError?.message}
          </span>
        )}
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="neutral"
          size="sm"
          className="h-10 md:h-9 px-2 md:px-3 min-w-[80px] sm:min-w-[100px] max-w-[50%] text-xs sm:text-sm"
          disabled={safeBusy}
        >
          {safeBusy ? "Connecting…" : "Connect"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[280px] max-w-[92vw] text-sm p-2">
        <div className="grid grid-cols-1 gap-2">
          {connectors.map((connector) => (
            <Button
              key={connector.id}
              type="button"
              variant="neutral"
              className="w-full justify-between"
              onClick={() => handleConnect(connector.id)}
              disabled={busy}
            >
              <span className="truncate">{friendlyConnectorName(connector.name)}</span>
              <span aria-hidden className="opacity-70">→</span>
            </Button>
          ))}
          {(localError || connectError) && (
            <div className="text-[11px] text-red-500">
              {localError || connectError?.message}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
