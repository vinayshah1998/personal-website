---
title: "Debugging a Missing Express Route in Production"
date: "2025-01-29"
tags: ["express", "oauth", "typescript", "debugging", "railway", "node"]
excerpt: "How strategic console.log statements helped me verify that a seemingly missing route was actually loading correctly all along."
---

# Debugging a Missing Express Route in Production

## The Symptom

After implementing Google OAuth for my Chrome extension, the authentication flow looked perfect—until the final step. When the extension sent the Google access token to my backend, it received:

```html
Cannot POST /api/auth/oauth/google
```

This is Express's default 404 response. The route simply didn't exist on the server.

## The Puzzle

Here's what made this confusing: the code looked completely correct.

**index.ts:**
```typescript
import oauthRoutes from './routes/oauth.js';
// ... other imports

app.use('/api/auth/oauth', oauthRoutes);
```

**oauth.ts:**
```typescript
const router = Router();

router.post('/google', authRateLimit, async (req, res) => {
  // ... handler code
});

export default router;
```

The import was there. The route was mounted. The handler was defined. So why was Express returning 404?

## Possible Causes

When a route exists in code but returns 404 in production, there are several possibilities:

1. **Import failure** - The module fails to load (syntax error, missing dependency)
2. **Runtime error during initialization** - The module loads but crashes before registering routes
3. **Deployment issue** - The file wasn't included in the deploy
4. **Circular dependency** - The import resolves to `undefined` due to import cycles
5. **TypeScript compilation** - The `.ts` file wasn't compiled to `.js`

Without logs, any of these could be the culprit. The deployment looked successful, and I had no errors in my logs—because there were no logs to show what was happening during module loading.

## The Debugging Strategy

Rather than guessing, I added strategic logging to trace exactly where the module loading process might be failing.

### Step 1: Log at Module Load Time

In `oauth.ts`, I added logging at the very start:

```typescript
import { Router, Response } from 'express';
// ... other imports

console.log('oauth.ts module loading...');

const router = Router();
```

If this message appears, we know the file is being executed.

### Step 2: Log After Route Registration

At the end of `oauth.ts`, before the export:

```typescript
router.post('/google', authRateLimit, async (req, res) => {
  // ... handler
});

console.log('oauth.ts routes registered, exporting router');
export default router;
```

If both messages appear, the module loaded completely.

### Step 3: Log the Import Result

In `index.ts`, immediately after the import:

```typescript
import oauthRoutes from './routes/oauth.js';
console.log('OAuth routes imported:', typeof oauthRoutes, oauthRoutes);
```

This shows us exactly what value the import resolved to. If it's `undefined` or not a function, we have our answer.

### Step 4: Log the Mount Operation

Wrap the route mounting in a try-catch:

```typescript
try {
  app.use('/api/auth/oauth', oauthRoutes);
  console.log('OAuth routes mounted successfully');
} catch (error) {
  console.error('Failed to mount OAuth routes:', error);
}
```

## The Results

After deploying with these logs, I checked the Railway deployment logs:

```
oauth.ts module loading...
oauth.ts routes registered, exporting router
OAuth routes imported: function [Function: router] {
  params: {},
  _params: [],
  caseSensitive: undefined,
  mergeParams: undefined,
  strict: undefined,
  stack: [
    Layer {
      handle: [Function: bound dispatch],
      name: 'bound dispatch',
      params: undefined,
      path: undefined,
      keys: [],
      regexp: /^\/google\/?$/i,
      route: [Route]
    }
  ]
}
OAuth routes mounted successfully
Server running on port 8080
```

Everything was loading correctly. The module was executing, the routes were registered, the import resolved to a proper Router object, and the mount succeeded.

## The Real Issue

With the logs confirming the route was properly registered, I tested the endpoint:

```bash
curl -X POST https://my-app.up.railway.app/api/auth/oauth/google \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "test"}'
```

Response:
```json
{"error":"Invalid or expired access token"}
```

The route was working. The earlier 404 must have been from a previous deployment that didn't include the new file, or I was testing before the deployment completed.

## Lessons Learned

### 1. Add Logging During Development, Not Just Debugging

If I had included basic startup logging from the beginning:

```typescript
console.log('oauth.ts loaded');
```

I would have immediately seen whether the file was being included in production.

### 2. Log Import Results for New Modules

When adding a new module, temporarily log what the import resolves to:

```typescript
import newModule from './new-module.js';
console.log('newModule:', typeof newModule);
```

This catches circular dependencies and failed imports immediately.

### 3. Trust the Logs, Not Your Assumptions

I assumed the code was correct and spent time re-reading it. The logs took 2 minutes to add and immediately showed the route was working.

### 4. Verify Deployment Timing

Railway (and similar platforms) trigger deployments asynchronously. When you push code, the old deployment might still be serving requests for a minute or two. Always verify:

- The deployment completed
- The new code is actually running (startup logs help here)

### 5. Keep Debug Logs Minimal in Production

The detailed logging I added was helpful for debugging but too verbose for permanent use. For production, I'd reduce it to:

```typescript
console.log('Routes initialized: auth, oauth, billing, llm');
```

## A Debugging Template

For future route registration issues, here's the pattern:

```typescript
// new-routes.ts
console.log('[new-routes] Module loading');
const router = Router();

router.post('/endpoint', handler);

console.log('[new-routes] Routes registered');
export default router;

// index.ts
import newRoutes from './routes/new-routes.js';
console.log('[new-routes] Import result:', typeof newRoutes);

try {
  app.use('/api/new', newRoutes);
  console.log('[new-routes] Mounted at /api/new');
} catch (e) {
  console.error('[new-routes] Mount failed:', e);
}
```

Four log statements that trace the entire route registration lifecycle.

## Conclusion

The route was never actually missing—it was working the whole time. The 404 I saw was likely from testing before the deployment completed.

But the debugging process was still valuable. The logging pattern I developed will catch real issues in the future: failed imports, circular dependencies, runtime errors during initialization, and missing files in deployments.

When debugging, don't just read the code and think harder. Add instrumentation and let the logs tell you what's actually happening.

---

**Tech Stack:**
- Express.js with TypeScript
- Railway deployment (GitHub integration)
- Chrome Extension with Google OAuth

**Time to Debug:** ~30 minutes

**Time to Add Logging:** 5 minutes

**Lesson Cost:** Priceless
