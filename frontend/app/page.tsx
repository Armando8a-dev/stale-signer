"use client";

import { useCallback, useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { sepolia } from "wagmi/chains";
import type { Hex } from "viem";

const CERT = "0xBcBf9EB50D2124e92e1C0F9867959A2189937619" as const;

const ABI = [
  { type: "function", name: "mintBAC", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "certificateOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

function short(addr?: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "—";
}
function chainName(id?: number) {
  return id === sepolia.id ? "Sepolia" : id ? `Chain ${id}` : "—";
}

/** window.ethereum, read once at connect and never again — the exact pattern this course's own B21 boilerplate ships. */
function useNaiveSnapshot(connected: boolean) {
  const [snap, setSnap] = useState<{ address?: string; chainId?: number; capturedAt?: number }>({});

  useEffect(() => {
    if (!connected || snap.capturedAt) return;
    const eth = (window as unknown as { ethereum?: { request: (a: { method: string }) => Promise<unknown> } }).ethereum;
    if (!eth) return;

    (async () => {
      const accounts = (await eth.request({ method: "eth_accounts" })) as string[];
      const chainHex = (await eth.request({ method: "eth_chainId" })) as string;
      setSnap({ address: accounts[0], chainId: parseInt(chainHex, 16), capturedAt: Date.now() });
    })();
    // No `accountsChanged` / `chainChanged` listener on purpose — that omission is the entire bug.
  }, [connected, snap.capturedAt]);

  return snap;
}

export default function Page() {
  const { address, isConnected } = useAccount();
  const liveChain = useChainId();
  const naive = useNaiveSnapshot(isConnected);

  const [ago, setAgo] = useState(0);
  useEffect(() => {
    if (!naive.capturedAt) return;
    const id = setInterval(() => setAgo(Math.floor((Date.now() - naive.capturedAt!) / 1000)), 1000);
    return () => clearInterval(id);
  }, [naive.capturedAt]);

  const drifted = Boolean(naive.address && address && naive.address.toLowerCase() !== address.toLowerCase());
  const naiveTone = !naive.capturedAt ? "stale" : drifted ? "drift" : "stale";

  const { data: already, refetch } = useReadContract({
    address: CERT, abi: ABI, functionName: "certificateOf", args: [address ?? "0x0"],
    query: { enabled: Boolean(address) },
  });
  const minted = typeof already === "bigint" && already > 0n;

  const { writeContractAsync, isPending } = useWriteContract();
  const [hash, setHash] = useState<Hex | undefined>();
  const { isLoading: mining, isSuccess: mined } = useWaitForTransactionReceipt({ hash });
  useEffect(() => { if (mined) refetch(); }, [mined, refetch]);

  const mint = useCallback(async () => {
    try { setHash(await writeContractAsync({ address: CERT, abi: ABI, functionName: "mintBAC", args: [] })); }
    catch { /* rejected */ }
  }, [writeContractAsync]);

  const busy = isPending || mining;

  return (
    <main className="relative min-h-screen">
      <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col px-6">
        <header className="flex flex-wrap items-center justify-between gap-6 py-8">
          <div>
            <h1 className="text-[26px] font-bold leading-none tracking-tight">StaleSigner</h1>
            <p className="mono mt-2 text-[11px] uppercase tracking-[.18em] text-[var(--dim)]">
              Block 21+22 · wallet integration
            </p>
          </div>
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
        </header>

        <p className="mt-4 max-w-xl text-[19px] leading-snug text-[#cfc7b8] sm:text-[22px]">
          Two readouts of the <span className="font-bold text-white">same wallet</span>.
          Switch accounts in MetaMask — <span className="font-bold text-white">only one notices.</span>
        </p>

        {/* ── the two signals ──────────────────────────────────────────── */}
        <section className="mt-10 flex flex-col gap-4 md:flex-row md:items-stretch">
          <div className="signal flex-1" data-tone={naiveTone}>
            <div className="flex items-center justify-between">
              <span className="badge" data-tone={naiveTone}>
                {drifted ? "Drifted" : "Captured once"}
              </span>
              <span className="blip" />
            </div>
            <p className="mono mt-5 text-[22px] font-bold">{short(naive.address)}</p>
            <p className="mono mt-1 text-[13px] text-[var(--dim)]">{chainName(naive.chainId)}</p>
            <div className="wave mt-5">
              {Array.from({ length: 14 }).map((_, i) => (
                <span key={i} style={{ height: `${8 + ((i * 7) % 18)}px` }} />
              ))}
            </div>
            <p className="mono mt-5 text-[11px] text-[var(--dim)]">
              {naive.capturedAt ? `captured ${ago}s ago — never re-read` : "waiting for connection…"}
            </p>
            <p className="mt-3 text-[12px] leading-relaxed text-[var(--dim)]">
              Read once from <span className="mono">window.ethereum</span> on connect. No
              listener. This is exactly the block&apos;s own React+MetaMask template.
            </p>
          </div>

          <div className="tether" />

          <div className="signal flex-1" data-tone={isConnected ? "live" : "stale"}>
            <div className="flex items-center justify-between">
              <span className="badge" data-tone={isConnected ? "live" : "stale"}>
                {isConnected ? "Live" : "Disconnected"}
              </span>
              <span className="blip" />
            </div>
            <p className="mono mt-5 text-[22px] font-bold">{short(address)}</p>
            <p className="mono mt-1 text-[13px] text-[var(--dim)]">{chainName(liveChain)}</p>
            <div className="wave mt-5">
              {Array.from({ length: 14 }).map((_, i) => (
                <span key={i} style={{ height: `${8 + ((i * 11) % 18)}px` }} />
              ))}
            </div>
            <p className="mono mt-5 text-[11px] text-[var(--dim)]">
              {isConnected ? "subscribed — updates the instant you switch" : "waiting for connection…"}
            </p>
            <p className="mt-3 text-[12px] leading-relaxed text-[var(--dim)]">
              wagmi&apos;s <span className="mono">useAccount()</span> watches{" "}
              <span className="mono">accountsChanged</span> for you. Same wallet, correct answer.
            </p>
          </div>
        </section>

        {drifted && (
          <p className="mt-5 text-center text-[14px] font-bold text-[var(--drift)]">
            The left card still thinks you&apos;re {short(naive.address)}. You&apos;re not anymore.
          </p>
        )}

        {/* ── mint, always against the live address ───────────────────── */}
        <section className="mt-10 flex flex-col items-center gap-4 pb-16">
          <button className="act act-primary" onClick={mint} disabled={!isConnected || busy || minted}>
            {!isConnected ? "Connect to mint" : minted ? "Certificate minted ✓" : busy ? "…" : "Mint certificate (uses the live signal)"}
          </button>
          <p className="mono max-w-sm text-center text-[11px] text-[var(--dim)]">
            Minting always reads the <span className="text-[var(--live)]">live</span> panel. A
            contract call built on the frozen one would mint to whoever was connected
            minutes ago — not whoever is holding the wallet now.
          </p>

          <div className="mono mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] text-[var(--dim)]">
            <a className="hover:text-[#cfc7b8]" href={`https://sepolia.etherscan.io/address/${CERT}`} target="_blank" rel="noreferrer">contract ↗</a>
            <a className="hover:text-[#cfc7b8]" href="https://github.com/Armando8a-dev/stale-signer" target="_blank" rel="noreferrer">source ↗</a>
            <span>Sepolia testnet</span>
          </div>
        </section>
      </div>
    </main>
  );
}
