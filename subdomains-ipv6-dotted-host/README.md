# `req.subdomains` splits an IPv6 host that contains dots

`req.subdomains` must not split a host that is an IP address. This works for
`[::1]`. An IPv6 address can also contain dots, for example the IPv4-mapped
address `[::ffff:127.0.0.1]`. On 5.3.0 and 4.22.3, `req.subdomains` splits
that host on the dots:

```js
app.get('/', (req, res) => res.json(req.subdomains))

// Host: [::1]                -> []
// Host: [::ffff:127.0.0.1]   -> ["0","[::ffff:127"]
// Host: [64:ff9b::192.0.2.1] -> ["0","[64:ff9b::192"]
```

Not affected: `req.hostname` is correct, and IPv4 hosts such as `127.0.0.1`
are not split.

## Run it

No network is needed. The script starts one app for each case, sends a request
with the Host header on a raw socket, and prints `req.subdomains`.

```bash
npm install
npm run repro
```

The script writes the Host header on a raw socket because `fetch()` rewrites
`[::ffff:127.0.0.1]` to `[::ffff:7f00:1]`. curl and `http.get()` send the host
as written.

## What you should see

Output of `npm run repro` on 5.3.0:

```
=== Host: [::1], subdomain offset 2 ===
  expected: []
  got:      []

=== Host: [::ffff:127.0.0.1], subdomain offset 2 ===
  expected: []
  got:      ["0","[::ffff:127"]

=== Host: [64:ff9b::192.0.2.1], subdomain offset 2 ===
  expected: []
  got:      ["0","[64:ff9b::192"]

=== Host: [::ffff:127.0.0.1], subdomain offset 0 ===
  expected: ["[::ffff:127.0.0.1]"]
  got:      ["1]","0","0","[::ffff:127"]

=== RESULT ===
  BUG: 3 of 4 hosts were split into subdomains.
```

The exit code of `npm run repro` is 1. 4.22.3 gives the same result.

## Why it happens

`req.hostname` keeps the brackets of an IPv6 host. In `lib/request.js` (line 389
on 5.3.0), `req.subdomains` gives that value to `isIP()`:

```js
var subdomains = !isIP(hostname)
  ? hostname.split('.').reverse()
  : [hostname];
```

`isIP('[::1]')` returns 0, so every IPv6 host is split on `.`. The `[::1]` test
in `test/req.subdomains.js` passes only because `[::1]` has no dots.

## Verifying a fix

With the fix, no case is split, and the last lines are:

```
=== RESULT ===
  FIXED: no IP address host was split.
```

The exit code is 0. To test a local build, install it with
`npm install ./path/to/express` and run `npm run repro`.

## Versions

`express` 5.3.0 and 4.22.3 · Node 24.21.0 · macOS.
