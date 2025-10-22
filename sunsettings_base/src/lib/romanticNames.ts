// Deterministic romantic name generator for wallet addresses
// Produces adjective + noun with a romantic undertone, based on a hash of the address.

const romanticAdjectives = [
  "moonlit",
  "tender",
  "golden",
  "starry",
  "wistful",
  "gentle",
  "radiant",
  "soft",
  "velvet",
  "hushed",
  "serene",
  "blushing",
  "glowing",
  "secret",
  "azure",
  "amber",
  "silver",
  "crimson",
  "honeyed",
  "mellow",
  "dreamy",
  "warm",
  "lilac",
  "dusky",
  "rosy",
  "lunar",
  "sunlit",
  "saffron",
  "silken",
  "bright",
  "quiet",
  "mystic",
  "sweet",
  "wild",
  "endless",
  "eternal",
  "faithful",
  "gentled",
  "quieted",
  "kindred",
  "yearning",
  "rosed",
  "dear",
  "lovelorn",
  "sacred",
  "true",
  "patient",
  "darling",
  "shy",
];

const romanticNouns = [
  "rose",
  "whisper",
  "heart",
  "dream",
  "kiss",
  "breeze",
  "promise",
  "ember",
  "twilight",
  "solace",
  "petal",
  "secret",
  "serenade",
  "horizon",
  "starlight",
  "glow",
  "blossom",
  "echo",
  "melody",
  "riddle",
  "dawn",
  "wish",
  "silence",
  "murmur",
  "velvet",
  "lullaby",
  "sigh",
  "memory",
  "dew",
  "glisten",
  "harbor",
  "haven",
  "oath",
  "lantern",
  "garden",
  "shelter",
  "amaranth",
  "iris",
  "candle",
  "ripple",
  "aura",
  "veil",
  "halo",
  "eden",
  "thistle",
  "mirth",
  "spark",
  "solstice",
];

// FNV-1a 32-bit hash for determinism and speed
function fnv1a32(input: string): number {
  let hash = 0x811c9dc5; // offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // 32-bit FNV prime: 16777619
    hash =
      (hash +
        ((hash << 1) +
          (hash << 4) +
          (hash << 7) +
          (hash << 8) +
          (hash << 24))) >>>
      0;
  }
  return hash >>> 0;
}

function normalize(addr: string | null | undefined): string {
  return String(addr ?? "")
    .trim()
    .toLowerCase();
}

export function getRomanticNameForAddress(
  address: string | null | undefined
): string {
  const base = normalize(address);
  // Derive two indices from independent-ish hashes to limit pairing collisions
  const h1 = fnv1a32(base);
  const h2 = fnv1a32(base + "::noun");
  const adj =
    romanticAdjectives[h1 % romanticAdjectives.length] ?? romanticAdjectives[0];
  const noun = romanticNouns[h2 % romanticNouns.length] ?? romanticNouns[0];
  return `${adj} ${noun}`;
}

export { romanticAdjectives, romanticNouns };
