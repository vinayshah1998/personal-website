---
title: "Why My Stripe Webhooks Were Failing: A Production Debugging Story"
date: "2025-01-29"
tags: ["stripe", "webhooks", "railway", "express", "debugging", "production"]
excerpt: "How I tracked down why Stripe subscriptions weren't updating in my Chrome extension, discovering two subtle but critical configuration issues along the way."
---

# Why My Stripe Webhooks Were Failing: A Production Debugging Story

## The Symptom

I had just switched my Chrome extension's backend from Stripe test mode to production. Users could complete the checkout flow, and I could see their subscriptions in the Stripe Dashboard. But the extension stubbornly showed "No active subscription."

Even creating a brand new account with a fresh subscription didn't work. The subscription existed in Stripe, but my app had no idea.

## Understanding the Architecture

Before diving into debugging, it helps to understand how Stripe subscription status flows through a typical application:

```
User completes checkout
        ↓
Stripe fires webhook events
        ↓
Backend receives webhook → Updates database
        ↓
Extension fetches status → Shows "Active" or "Trial"
```

The key insight: **the database is only updated via webhooks**. If webhooks aren't working, the database never learns about the subscription, regardless of what Stripe shows.

## The Investigation

### Step 1: Check Webhook Delivery Status

My first stop was the Stripe Dashboard under Developers → Webhooks. I clicked on my webhook endpoint and checked the recent deliveries.

**Finding:** A mix of 404 and 502 errors. Not a single successful delivery.

This immediately told me the issue was infrastructure-related, not code logic.

### Step 2: Diagnose the 502 Errors

502 errors typically mean the server crashed or didn't respond in time. I checked my Railway deployment logs:

```
ValidationError: The 'X-Forwarded-For' header is set but the Express
'trust proxy' setting is false (default). This could indicate a
misconfiguration which would prevent express-rate-limit from accurately
identifying users.
```

**Root cause found.** Railway (like most cloud platforms) runs behind a reverse proxy. When a request comes in, the client's real IP address is in the `X-Forwarded-For` header, not directly on the socket.

The `express-rate-limit` middleware I was using validates this configuration, and throws an error when it detects the header but Express isn't configured to trust it. This error was crashing my server on every request.

**The fix:**

```typescript
const app = express();

// Trust proxy for Railway (required for express-rate-limit)
app.set('trust proxy', 1);
```

This single line tells Express to trust the first proxy in the chain and use `X-Forwarded-For` for `req.ip`.

### Step 3: Diagnose the 404 Errors

After fixing the 502s, I redeployed and had Stripe resend a webhook. This time I got a clear 404 response:

```html
<!DOCTYPE html>
<html lang="en">
<head><title>Error</title></head>
<body>
<pre>Cannot POST /</pre>
</body>
</html>
```

**The problem:** My webhook URL in Stripe was pointing to the root path `/` instead of `/webhooks/stripe`.

When I originally set up the webhook in test mode, I must have forgotten to include the full path. The URL should have been:

```
https://my-app.up.railway.app/webhooks/stripe
                                 ^^^^^^^^^^^^^^^^
                                 This part was missing
```

### Step 4: Verify the Fix

After updating the webhook URL in Stripe Dashboard, I resent the event. This time:

- HTTP 200 response
- Logs showed: `Webhook received: customer.subscription.created`
- Database updated with `status: trialing`
- Extension finally showed "Trial"

## The Two Bugs

In summary, two issues combined to break webhooks:

| Issue | Symptom | Fix |
|-------|---------|-----|
| Missing `trust proxy` | 502 errors, server crashes | `app.set('trust proxy', 1)` |
| Wrong webhook URL | 404 errors | Add `/webhooks/stripe` to URL |

Neither issue alone would have been obvious. The 502s masked the 404s, and both had to be fixed for webhooks to work.

## Lessons Learned

### 1. Always Check Webhook Delivery Status First

When subscription status isn't updating, don't start debugging your code. Go straight to Stripe Dashboard → Webhooks → Recent deliveries. The HTTP status codes tell you exactly where the problem is:

- **200**: Webhook delivered, issue is in your handler code
- **400**: Signature verification failed (wrong secret)
- **404**: Wrong URL path
- **500/502**: Server error (check logs)

### 2. Cloud Platforms Need `trust proxy`

If you're deploying to Railway, Heroku, Render, AWS, or basically any cloud platform, you're behind a reverse proxy. Add this early in your Express setup:

```typescript
app.set('trust proxy', 1);
```

This affects:
- `req.ip` - Without it, you get the proxy's IP, not the client's
- Rate limiting - Many rate limit libraries check this configuration
- Secure cookies - `req.secure` checks the `X-Forwarded-Proto` header

### 3. Test vs Production Webhooks Are Separate

When switching from Stripe test mode to production:
- Create a **new** webhook endpoint for production
- Get a **new** webhook signing secret
- Update your environment variables
- Test with a real event before assuming it works

### 4. Add Webhook Logging

I added these logs to help debug faster next time:

```typescript
// After signature verification
console.log(`Webhook received: ${event.type}, id: ${event.id}`);

// After processing
console.log(`Processed ${event.type}: ${subscription.id}, status: ${subscription.status}`);
```

Without success logs, you can't tell if webhooks are being received at all.

### 5. Webhooks Are Your Single Source of Truth

In a subscription system, your database status is only as good as your webhook handling. Stripe is the source of truth, and webhooks are the only way that truth reaches your app.

If webhooks fail, your app is blind to:
- New subscriptions
- Cancellations
- Payment failures
- Trial expirations

It's worth investing time to make webhook handling rock-solid.

## Debugging Checklist for Stripe Webhooks

For future reference, here's my checklist when webhooks aren't working:

1. **Check Stripe Dashboard** - What HTTP status are deliveries returning?
2. **Check server logs** - Any errors during webhook processing?
3. **Verify webhook URL** - Is the full path correct? (`/webhooks/stripe`)
4. **Verify webhook secret** - Is `STRIPE_WEBHOOK_SECRET` set correctly for production?
5. **Check `trust proxy`** - Is Express configured for your hosting platform?
6. **Test signature verification** - Try logging before and after `constructEvent()`
7. **Check user lookup** - Is the customer ID in your database?

## Conclusion

What seemed like a complex "subscriptions not syncing" bug turned out to be two straightforward configuration issues. The hard part was finding them.

Cloud deployment adds layers of infrastructure (reverse proxies, load balancers) that can interact with your code in unexpected ways. When something breaks in production but worked locally, that infrastructure is often the culprit.

And always, always check the webhook delivery status in Stripe before diving into code. It'll save you hours of debugging the wrong thing.

---

**Tech Stack:**
- Express.js backend
- Railway deployment
- Stripe Billing with webhooks
- Chrome Extension (Manifest V3)

**Time to Debug:** ~2 hours

**Time to Fix:** 5 minutes (once identified)
