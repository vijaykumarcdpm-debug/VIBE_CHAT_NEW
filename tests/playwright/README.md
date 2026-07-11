This Playwright test simulates a mirrored local preview but sends an unmirrored outgoing stream (canvas capture) and verifies the remote peer receives the unmirrored orientation.

Run locally:

```bash
npm install
npx playwright install --with-deps
npm run test:playwright
```
