import { chromium } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadTestEnv } from './test-env.mjs';
import { FIXTURE_PASSWORD, qaFixtureEmail } from './fixtures/qa-fixtures.mjs';

const label = process.argv[2] ?? 'latest';
if (!/^[a-z0-9-]{1,40}$/.test(label)) throw new Error('Use a short alphanumeric measurement label');
const env = loadTestEnv();
const jar = new Map();
const auth = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: {
    getAll: () => [...jar.values()],
    setAll: items => items.forEach(cookie => jar.set(cookie.name, cookie)),
  },
});
const base = '/games/overwatch/clan/73441bc9-2ffd-4789-8da4-f50423073706';
let browser;
try {
  const { error } = await auth.auth.signInWithPassword({
    email: qaFixtureEmail('Leader', '01'), password: FIXTURE_PASSWORD,
  });
  if (error) throw error;
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1304, height: 884 } });
  await context.addCookies([...jar.values()].map(cookie => ({
    name: cookie.name, value: cookie.value,
    url: 'http://127.0.0.1:3010', httpOnly: false, sameSite: 'Lax',
  })));
  const results = [];
  for (const route of [base + '/balance', base + '/manage?tab=balance', base + '/stats', base + '/events']) {
    const page = await context.newPage();
    let scriptBytes = 0;
    const tasks = [];
    page.on('response', response => {
      if (response.request().resourceType() === 'script') {
        tasks.push(response.body().then(body => { scriptBytes += body.length; }));
      }
    });
    const timings = [];
    for (let iteration = 0; iteration < 5; iteration++) {
      const response = await page.goto('http://127.0.0.1:3010' + route, { waitUntil: 'load' });
      if (!response?.ok() || !page.url().includes(base)) throw new Error('QA page failed or redirected');
      await page.locator('#main-content').waitFor();
      timings.push(await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          ttfbMs: Math.round(navigation.responseStart - navigation.requestStart),
          documentBytes: navigation.decodedBodySize,
        };
      }));
    }
    await Promise.all(tasks);
    results.push({ route, timings, scriptDecodedBytesAcross5Loads: scriptBytes });
    await page.close();
  }
  mkdirSync('.supabase-test', { recursive: true });
  writeFileSync('.supabase-test/alpha-' + label + '.json', JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results));
} finally {
  await browser?.close();
  // Never revoke another browser session of the shared QA leader account.
  await auth.auth.signOut({ scope: 'local' });
}
