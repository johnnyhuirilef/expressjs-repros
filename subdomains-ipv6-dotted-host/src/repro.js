'use strict'

/**
 * `req.subdomains` must not split an IP address host. It works for `[::1]`,
 * but an IPv6 host that contains dots (an IPv4-mapped address, for example)
 * is split on the dots, because `isIP()` gets the host with its brackets.
 *
 *   npm run repro
 *
 * The Host header is written on a raw socket. `fetch()` rewrites
 * `[::ffff:127.0.0.1]` to `[::ffff:7f00:1]`, but curl and `http.get()` send it
 * as written.
 */
const express = require('express')
const net = require('node:net')

const CASES = [
  { host: '[::1]', offset: 2, expected: [] },
  { host: '[::ffff:127.0.0.1]', offset: 2, expected: [] },
  { host: '[64:ff9b::192.0.2.1]', offset: 2, expected: [] },
  { host: '[::ffff:127.0.0.1]', offset: 0, expected: ['[::ffff:127.0.0.1]'] }
]

function createApp (offset) {
  const app = express()
  app.set('subdomain offset', offset)
  app.get('/', (req, res) => res.json(req.subdomains))
  return app
}

function requestWithHost (port, host) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1', () => {
      socket.end(`GET / HTTP/1.1\r\nHost: ${host}\r\nConnection: close\r\n\r\n`)
    })
    const chunks = []
    socket.on('data', (chunk) => chunks.push(chunk))
    socket.on('error', reject)
    socket.on('end', () => {
      const body = Buffer.concat(chunks).toString().split('\r\n\r\n')[1]
      resolve(body)
    })
  })
}

async function subdomainsFor ({ host, offset }) {
  const server = createApp(offset).listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  try {
    return await requestWithHost(server.address().port, host)
  } finally {
    server.close()
  }
}

async function main () {
  const results = await Promise.all(CASES.map(async (testCase) => {
    const got = await subdomainsFor(testCase)
    return { ...testCase, got, ok: got === JSON.stringify(testCase.expected) }
  }))
  const failed = results.filter(({ ok }) => !ok).length

  results.forEach(({ host, offset, expected, got }) => {
    console.log(`=== Host: ${host}, subdomain offset ${offset} ===`)
    console.log(`  expected: ${JSON.stringify(expected)}`)
    console.log(`  got:      ${got}\n`)
  })
  console.log('=== RESULT ===')
  console.log(failed === 0
    ? '  FIXED: no IP address host was split.'
    : `  BUG: ${failed} of ${CASES.length} hosts were split into subdomains.`)
  process.exitCode = failed === 0 ? 0 : 1
}

main()
