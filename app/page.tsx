"use client";

import Script from "next/script";
import { useEffect, useState, useRef } from "react";

declare global {
  interface Window {
    Calendly?: { initPopupWidget: (options: { url: string }) => void; initInlineWidget: (options: { url: string; parentElement: HTMLElement; config?: { layout?: { month?: number } } }) => void };
    PaystackPop?: new () => { resumeTransaction: (accessCode: string) => void };
  }
}

type CalendlyMessage = { event?: string; payload?: { event?: { uri?: string }; invitee?: { uri?: string } } };
type PaystackMessage = { event?: string; data?: { status?: string; event?: string } };

export default function BookingPage() {
  const [status, setStatus] = useState("Opening the booking calendar…");
  const [calendlyReady, setCalendlyReady] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;
  const calendlyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!calendlyUrl) { console.error("Calendly URL not configured"); return; }
    if (calendlyReady && calendlyRef.current) {
      console.log("Calendly script loaded, initializing inline widget...");
      if (window.Calendly) {
        window.Calendly.initInlineWidget({
          url: calendlyUrl,
          parentElement: calendlyRef.current,
          config: {
            layout: {
              month: 1
            }
          }
        });
      } else {
        console.error("Calendly object not available on window");
      }
    }
    async function handleScheduledEvent(message: MessageEvent<CalendlyMessage>) {
      if (message.origin !== "https://calendly.com") return;
      
      console.log("Calendly event received:", message.data?.event);
      console.log("Payload:", message.data?.payload);
      
      // When date/time selected, open payment popup (blocks UI until paid)
      if (message.data?.event === "calendly.date_and_time_selected") {
        const paymentCompleted = sessionStorage.getItem('payment_completed_at');
        const paymentTime = paymentCompleted ? parseInt(paymentCompleted) : 0;
        const timeSincePayment = Date.now() - paymentTime;
        
        // Only open payment if not completed in last 15 minutes
        if (!paymentCompleted || timeSincePayment > 15 * 60 * 1000) {
          console.log("Date/time selected, opening payment...");
          setShowPayment(true);
        }
      }
      
      // When event scheduled, mark payment as completed in session
      if (message.data?.event === "calendly.event_scheduled") {
        const eventUri = message.data.payload?.event?.uri;
        const inviteeUri = message.data.payload?.invitee?.uri;
        
        if (!eventUri || !inviteeUri) return;
        
        // Mark that payment was completed (user will have paid via Shop link)
        sessionStorage.setItem('payment_completed_at', Date.now().toString());
        
        // Save booking to database with paid status
        try {
          const reference = `bw_${crypto.randomUUID().replaceAll("-", "")}`;
          await fetch("/api/payments/initialize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventUri, inviteeUri }) });
          console.log("Booking saved");
        } catch (error) { console.error("Failed to save booking", error); }
      }
    }
    window.addEventListener("message", handleScheduledEvent);
    return () => window.removeEventListener("message", handleScheduledEvent);
  }, [calendlyReady, calendlyUrl]);

  // Listen for Paystack payment success messages from iframe
  useEffect(() => {
    function handlePaystackMessage(message: MessageEvent<PaystackMessage>) {
      // Paystack Shop may send success messages from various origins
      console.log("Paystack message received:", message.data);
      
      // Check for payment success
      if (message.data?.event === "success" || message.data?.status === "success") {
        console.log("Payment successful, closing popup...");
        setPaymentSuccess(true);
        // Close payment popup after a short delay to show success, then allow user to continue with Calendly
        setTimeout(() => {
          setShowPayment(false);
          setPaymentSuccess(false); // Reset for next time
        }, 2000);
      }
    }
    window.addEventListener("message", handlePaystackMessage);
    return () => window.removeEventListener("message", handlePaystackMessage);
  }, []);

  return <main style={{ margin: 0, padding: 0, width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
    <div ref={calendlyRef} style={{ width: '100%', height: '100%' }}></div>
    
    {showPayment && (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '90%', maxWidth: '600px', height: '80%', backgroundColor: 'white', borderRadius: '8px', position: 'relative' }}>
          {!paymentSuccess && (
            <button 
              onClick={() => setShowCloseWarning(true)}
              style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10000, backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontSize: '18px' }}
            >
              ×
            </button>
          )}
          {paymentSuccess ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
              <h2 style={{ margin: '0 0 10px 0', color: '#00a651' }}>Payment Successful!</h2>
              <p style={{ color: '#666', marginBottom: '20px' }}>Your consultation booking has been confirmed. You can now continue with your booking.</p>
              <button 
                onClick={() => {
                  setShowPayment(false);
                  setPaymentSuccess(false);
                }}
                style={{ padding: '12px 24px', backgroundColor: '#00a651', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}
              >
                Continue Booking
              </button>
            </div>
          ) : (
            <iframe 
              src="https://paystack.shop/pay/beginwaka_advisory" 
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
              title="Payment"
            />
          )}
        </div>
      </div>
    )}
    
    {showCloseWarning && (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', maxWidth: '400px', textAlign: 'center' }}>
          <h3 style={{ marginTop: 0 }}>Cancel Payment?</h3>
          <p style={{ marginBottom: '20px' }}>Closing payment will cancel your booking for this consultation session.</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button 
              onClick={() => {
                setShowCloseWarning(false);
                setShowPayment(false);
                window.location.reload();
              }}
              style={{ padding: '10px 20px', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Yes, Cancel
            </button>
            <button 
              onClick={() => setShowCloseWarning(false)}
              style={{ padding: '10px 20px', backgroundColor: '#006bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Stay & Pay
            </button>
          </div>
        </div>
      </div>
    )}
    
    <Script src="https://assets.calendly.com/assets/external/widget.js" strategy="afterInteractive" onLoad={() => setCalendlyReady(true)} />
    <Script src="https://js.paystack.co/v2/inline.js" strategy="afterInteractive" />
  </main>;
}
