"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAccount, useConnect, useDisconnect } from "wagmi"

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export default function WalletStatus(): React.JSX.Element {
  const { address, isConnecting, isReconnecting } = useAccount()
  const { disconnectAsync, isPending: isDisconnecting } = useDisconnect()
  const { connectAsync, connectors, error: connectError, status } = useConnect()
  const [open, setOpen] = React.useState(false)
  const [localError, setLocalError] = React.useState<string | null>(null)

  const busy = isConnecting || isReconnecting || status === "pending"

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

  if (address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs md:text-sm font-mono">{truncateAddress(address)}</span>
        <Button
          type="button"
          variant="neutral"
          size="sm"
          onClick={handleDisconnect}
          disabled={isDisconnecting}
        >
          {isDisconnecting ? "Disconnecting…" : "Disconnect"}
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
          disabled={busy}
        >
          {busy ? "Connecting…" : "Connect Wallet"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 text-sm">
        <div className="space-y-2">
          {connectors.map((connector) => (
            <Button
              key={connector.id}
              type="button"
              variant="neutral"
              className="w-full justify-start"
              onClick={() => handleConnect(connector.id)}
              disabled={busy}
            >
              {connector.name}
              {!connector.ready && !busy ? " (install)" : ""}
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
