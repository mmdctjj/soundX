import * as fs from 'fs';
import * as path from 'path';

/**
 * Build a two-way map between container-side and host-side paths of bind
 * mounts visible from the current process.
 *
 * The map is built once per process from /proc/self/mountinfo. We deliberately
 * ignore virtual filesystems (overlay, tmpfs, proc, sysfs, devpts, cgroup, ...)
 * because they don't carry a useful host source for media directories.
 *
 * When the running process is NOT inside a container (e.g. `pnpm start:dev` on
 * a developer machine), the bind mounts are typically the developer's own
 * filesystem entries and the host path is equal to the container path. The map
 * still contains them so callers don't have to special-case "not in Docker".
 *
 * Longest container-path wins on overlapping mounts so that `/music/audiobook`
 * inside a mount whose container root is `/music` correctly maps to the host
 * source of the *outer* mount when we walk up.
 */

interface MountMaps {
  containerToHost: Map<string, string>;
  hostToContainer: Map<string, string>;
}

/**
 * Operator-declared container ↔ host path pairs. These take precedence over
 * mountinfo because on NAS systems (e.g. Synology) the btrfs mount under
 * `/volume1` is invisible from inside the container — mountinfo only shows
 * paths relative to the superblock root, so it cannot recover the missing
 * `/volume1` prefix. Setting `*_HOST` env vars pushes the full host path in.
 */
interface ExplicitPair {
  container: string;
  host: string;
}
let explicitPairs: ExplicitPair[] = [];

export function registerHostPathPair(containerPath: string, hostPath: string): void {
  if (!containerPath || !hostPath) return;
  // Replace any prior registration for the same container path so the last
  // call wins (matches how seeding iterates per source kind).
  explicitPairs = explicitPairs.filter((p) => p.container !== containerPath);
  explicitPairs.push({ container: containerPath, host: hostPath });
}

const IGNORE_FS_PREFIXES = [
  'proc',
  'sysfs',
  'devpts',
  'tmpfs',
  'cgroup',
  'cgroup2',
  'overlay',
  'aufs',
  'squashfs',
  'nsfs',
  'autofs',
  'mqueue',
  'fusectl',
  'configfs',
  'debugfs',
  'tracefs',
  'pstore',
  'bpf',
  'ramfs',
  'binfmt_misc',
  'fuse.gvfsd-fuse',
  'fuse.portal',
  'hugetlbfs',
  'rpc_pipefs',
  'securityfs',
  'selinuxfs',
  'efivarfs',
  'devpts',
];

let cached: MountMaps | null = null;

function parseMountInfo(text: string): MountMaps {
  const containerToHost = new Map<string, string>();
  const hostToContainer = new Map<string, string>();

  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    // Format: mount-id parent-id major:minor root mount-point opts - fstype source super-opts
    const dashIdx = line.indexOf(' - ');
    if (dashIdx === -1) continue;
    const head = line.slice(0, dashIdx).split(' ');
    const tail = line.slice(dashIdx + 3).split(' ');
    if (head.length < 5 || tail.length < 2) continue;
    const root = head[3];
    const mountPoint = head[4];
    const fstype = tail[0];
    const source = tail[1];
    if (!mountPoint) continue;
    if (IGNORE_FS_PREFIXES.includes(fstype)) continue;

    // For a Docker bind mount, the host path equals the `root` field of the
    // mount line (the directory that was bound in). For filesystems mounted
    // from a device (e.g. ext4 on /dev/sda1), root is "/". Skip those — the
    // user-facing path is the mount point itself, not a host equivalent.
    if (!root || root === '/') continue;
    if (source === mountPoint) continue;

    containerToHost.set(mountPoint, root);
    hostToContainer.set(root, mountPoint);
  }
  return { containerToHost, hostToContainer };
}

/** Test seam: overridable so the spec can inject a sample without mocking fs. */
let readMountInfoImpl: () => string = () => {
  try {
    return fs.readFileSync('/proc/self/mountinfo', 'utf8');
  } catch {
    return '';
  }
};
export const readMountInfo = (): string => readMountInfoImpl();
/** Test-only setter; callers should not use this in production. */
export const __setReadMountInfoForTest = (fn: () => string): void => {
  readMountInfoImpl = fn;
};

function loadMountMaps(): MountMaps {
  if (cached) return cached;
  const text = readMountInfo();
  if (!text) {
    cached = { containerToHost: new Map(), hostToContainer: new Map() };
    return cached;
  }
  cached = parseMountInfo(text);
  return cached;
}

/**
 * Return the host-side source path for a given container-side mount point, or
 * the input unchanged if no matching bind mount is found.
 */
export function containerToHost(mountPoint: string): string {
  // Explicit pairs first — operators may have set *_HOST to recover paths
  // mountinfo can't see (see registerHostPathPair).
  const explicit = matchExplicitContainer(mountPoint);
  if (explicit) return applyExplicitContainer(explicit, mountPoint);

  const maps = loadMountMaps();
  // Longest matching prefix wins so deeply nested paths resolve correctly.
  let best: { mount: string; source: string } | null = null;
  for (const [m, s] of maps.containerToHost) {
    if (mountPoint === m || mountPoint.startsWith(m + '/')) {
      if (!best || m.length > best.mount.length) {
        best = { mount: m, source: s };
      }
    }
  }
  if (!best) return mountPoint;
  if (mountPoint === best.mount) return best.source;
  const suffix = mountPoint.slice(best.mount.length);
  return path.posix.join(best.source, suffix);
}

/**
 * Return the container-side mount point for a given host-side path, or the
 * input unchanged if no matching bind mount is found.
 */
export function hostToContainer(hostPath: string): string {
  const explicit = matchExplicitHost(hostPath);
  if (explicit) return applyExplicitHost(explicit, hostPath);

  const maps = loadMountMaps();
  let best: { host: string; container: string } | null = null;
  for (const [h, c] of maps.hostToContainer) {
    if (hostPath === h || hostPath.startsWith(h + '/')) {
      if (!best || h.length > best.host.length) {
        best = { host: h, container: c };
      }
    }
  }
  if (!best) return hostPath;
  if (hostPath === best.host) return best.container;
  const suffix = hostPath.slice(best.host.length);
  return path.posix.join(best.container, suffix);
}

function matchExplicitContainer(p: string): ExplicitPair | null {
  let best: ExplicitPair | null = null;
  for (const pair of explicitPairs) {
    if (p === pair.container || p.startsWith(pair.container + '/')) {
      if (!best || pair.container.length > best.container.length) best = pair;
    }
  }
  return best;
}

function matchExplicitHost(p: string): ExplicitPair | null {
  let best: ExplicitPair | null = null;
  for (const pair of explicitPairs) {
    if (p === pair.host || p.startsWith(pair.host + '/')) {
      if (!best || pair.host.length > best.host.length) best = pair;
    }
  }
  return best;
}

function applyExplicitContainer(pair: ExplicitPair, p: string): string {
  if (p === pair.container) return pair.host;
  return path.posix.join(pair.host, p.slice(pair.container.length));
}

function applyExplicitHost(pair: ExplicitPair, p: string): string {
  if (p === pair.host) return pair.container;
  return path.posix.join(pair.container, p.slice(pair.host.length));
}

/**
 * Test-only: drop the cached maps so the next call re-reads /proc/self/mountinfo,
 * and clear explicit pairs.
 */
export function __resetMountMapsForTest(): void {
  cached = null;
  explicitPairs = [];
}
