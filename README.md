# Beginwaka consultation booking

The Next.js app creates the Calendly booking first, opens a unique Paystack checkout immediately, records verified payment, and cancels unpaid bookings after the payment deadline.

## Next.js setup

1. Create a Supabase project and run [supabase/schema.sql](./supabase/schema.sql) in its SQL editor.
2. Copy `.env.example` to `.env.local` and fill in the values.
3. Set Paystack's webhook URL to `https://YOUR_DOMAIN/api/webhooks/paystack`.
4. Deploy to Vercel. The included cron job checks expired pending payments every five minutes.
5. Run `npm install`, then `npm run dev` for local development.

Keep `PAYSTACK_SECRET_KEY` and `SUPABASE_SECRET_KEY` server-only. `PAYSTACK_AMOUNT` uses the smallest currency unit; a ₦5,000 consultation is `500000`. The included five-minute Vercel Cron schedule requires a non-Hobby Vercel plan; use another scheduler if deploying on Vercel Hobby.

## Legacy static files

The remainder of this document describes the original browser-only prototype. `booking.html` and `embed-snippet.html` use a fixed Paystack Shop URL, so they cannot match a payment to a particular booking or cancel unpaid bookings. Use the Next.js app for the paid consultation flow.

## Files

- `booking.html` - Standalone booking page (Calendly opens automatically)
- `embed-snippet.html` - Code snippets to embed directly into your existing landing page

## How It Works

**Automated Booking Flow:**
1. Page loads → Calendly popup opens automatically
2. Customer selects date, time, and enters details
3. Customer clicks "Schedule Event" in Calendly
4. Paystack payment page automatically opens in a new tab
5. Customer completes payment → Booking confirmed

## Option 1: Embed into Your Landing Page (Recommended)

Use the snippets in `embed-snippet.html` to add booking functionality directly to your existing landing page:

1. **Add to `<head>`**: Calendly stylesheet
2. **Add to `<body>`**: Calendly widget script (opens automatically on page load + Paystack redirect)

### Example Integration

```html
<!-- In your landing page <head> -->
<link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet">

<!-- Before closing </body> -->
<script src="https://assets.calendly.com/assets/external/widget.js" async></script>
<script>
  // Open Calendly popup automatically on page load
  window.onload = function() {
    setTimeout(function() {
      Calendly.initPopupWidget({ url: 'https://calendly.com/beginwakaa' });
    }, 500);
  };

  // Redirect to Paystack after event is scheduled
  window.addEventListener('message', function(e) {
    if (e.data.event && e.data.event === 'calendly.event_scheduled') {
      window.open('https://paystack.shop/pay/beginwaka_advisory', '_blank');
    }
  });
</script>
```

## Option 2: Standalone Booking Page

Deploy `booking.html` as a separate page:
1. Host the file (Netlify, Vercel, GitHub Pages, etc.)
2. Link to it from your landing page button
3. When customers visit the page, Calendly opens automatically

## Important Notes

- The Calendly popup opens automatically after a 500ms delay (to ensure the widget is loaded)
- Users may need to allow popups in their browser settings
- After scheduling, Paystack opens in a new tab

## Customization

### Calendly
- URL: `https://calendly.com/beginwakaa`
- Auto-open delay: 500ms (adjust in the setTimeout)

### Paystack
- Payment link: `https://paystack.shop/pay/beginwaka_advisory`

Edit these values in the files to customize.
