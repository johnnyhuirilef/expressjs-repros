# expressjs-repros

Minimal, self-contained reproductions for issues that I reported against the
[expressjs](https://github.com/expressjs) organization.

Each directory is one reproduction: its own `package.json` with pinned
versions, and a README with the exact commands and the output to expect.
Each reproduction is plain JavaScript and runs with `npm install` and
`npm run repro`. The exit code is 1 when the bug is present and 0 when it is
fixed.

## expressjs/express

| Directory | Issue | What it shows |
|---|---|---|
| [`subdomains-ipv6-dotted-host`](./subdomains-ipv6-dotted-host) | *(pending)* | `req.subdomains` splits an IPv6 host that contains dots, such as `[::ffff:127.0.0.1]`, into `["0","[::ffff:127"]`, while `[::1]` and IPv4 hosts are not split |

## Other packages

When there is no issue, the link goes to the pull request that fixed it.

| Directory | Package | Issue or PR | What it shows |
|---|---|---|---|
