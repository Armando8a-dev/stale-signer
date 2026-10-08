# StaleSigner — one signal is lying to you

> The block's own React+MetaMask template reads `window.ethereum` once and never
> listens again. Switch accounts in your wallet and the UI doesn't notice — it keeps
> acting on someone you no longer are.

![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)
![Foundry](https://img.shields.io/badge/Tested%20with-Foundry-black)
![Tests](https://img.shields.io/badge/tests-7%20passing%20(1000%20fuzz%20runs)-success)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)
![License](https://img.shields.io/badge/license-MIT-blue)

📜 **BlockchainAcceleratorCertificate:** [0xBcBf9EB50D2124e92e1C0F9867959A2189937619](https://sepolia.etherscan.io/address/0xBcBf9EB50D2124e92e1C0F9867959A2189937619)

---

## Two cards, one wallet

The page reads the connected wallet two different ways and shows both at once:

```js
// Card 1 — exactly the accelerator's own React+MetaMask template (Block 21)
const accounts = await window.ethereum.request({ method: "eth_accounts" });
// ...captured once on connect. No accountsChanged listener. Ever.
```

```ts
// Card 2 — wagmi
const { address } = useAccount();
// subscribes to accountsChanged/chainChanged internally — updates itself
```

While nothing changes in the wallet, both cards agree. The moment you switch accounts
in MetaMask, card 1 keeps showing the address it captured minutes ago. Card 2 updates
before you've finished clicking. Same wallet, same page, two different answers to "who
is connected right now" — and only one of them is true.

## Why this is more than cosmetic

The mint button is wired to card 2's value on purpose. A real app built on card 1's
pattern doesn't just display the wrong address — it **transacts** against it: approvals,
signatures, and mints all get built from a snapshot of "whoever connected first," not
whoever is actually holding the wallet. That's the gap between a UI bug and a security
bug, and it's the same gap every time.

## The contract being minted against

`BlockchainAcceleratorCertificate.sol` implements the course's own Block 22 interface:

```solidity
interface IBlockchainAcceleratorCertificate {
    function mintBAC() external;
}
```

One certificate per wallet, non-transferable — it's proof of completion, not a
collectible:

```solidity
function mintBAC() external {
    if (certificateOf[msg.sender] != 0) revert AlreadyCertified(msg.sender, certificateOf[msg.sender]);
    uint256 tokenId = _nextId++;
    certificateOf[msg.sender] = tokenId;
    _mint(msg.sender, tokenId);
    emit Certified(msg.sender, tokenId);
}
```

`_update()` is overridden to revert on any transfer where both `from` and `to` are
non-zero, which is the standard soulbound pattern — mint and burn still work, wallet-to-
wallet transfer doesn't.

## Tests

`forge test` — 7 tests including a 1000-run fuzz:

| Test | What it proves |
|------|----------------|
| `test_MintBAC_IssuesTokenOne` | first mint succeeds, token 1 goes to the caller |
| `test_MintBAC_EmitsCertified` | the event fires with the right holder and id |
| `test_MintBAC_TokenIdsIncrementAcrossHolders` | ids are per-contract, not per-holder |
| `test_SecondMint_Reverts` | `AlreadyCertified` — one certificate per wallet |
| `test_Certificate_CannotBeTransferred` | the soulbound guard holds |
| `test_OwnerOf_UnmintedToken_Reverts` | standard ERC-721 behaviour on a token that doesn't exist |
| `testFuzz_EachWallet_MintsAtMostOnce` | 1000 random addresses, each mints once and only once |

## Run it

```bash
git submodule update --init --recursive
forge test -vv

cd frontend && npm ci && npm run dev
```

Try it yourself: connect a wallet, confirm both cards agree, then switch accounts
inside MetaMask without touching the page. Card 1 freezes. Card 2 doesn't.

## Design notes

- **Both cards read the same wallet through two different code paths**, not two
  different wallets — the point is that identical on-chain state produces two different
  answers purely based on *when* you last asked.
- **No `chains` beyond Sepolia are configured for wagmi**, but `useChainId()` still
  tracks whatever chain the wallet reports — the staleness demo works with an account
  switch alone, no second network needed.
- **The mint button always reads the live card.** Keeping the naive snapshot purely
  cosmetic on this page was a deliberate choice — wiring the mint to it would mean
  shipping the actual vulnerability, not demonstrating it.

## What I learned

- `window.ethereum` is a snapshot, not a subscription. Every wallet integration that
  reads it once and stores the result in `useState` has implicitly decided to never
  learn about an account switch again — and nothing about that code looks wrong on
  read.
- Libraries like wagmi aren't solving a convenience problem here, they're solving a
  correctness problem: `useAccount()` existing at all is an admission that the raw
  provider API is unsafe to use directly in anything stateful.
- Block 22's certificate contract is intentionally tiny — a single `mintBAC()` — which
  made it the right size to prove a frontend point without a second contract-level
  lesson competing for attention.

---

**Armando Ochoa** · Smart Contract Developer
Part of a 25+ block blockchain accelerator — this merges the web integration module
(Block 21) with the completion certificate (Block 22).
