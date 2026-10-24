"use client";

import Script from "next/script";
import { useEffect, useState, useRef } from "react";

declare global {
  interface Window {
    Calendly?: { initPopupWidget: (options: { url: string }) => void; initInlineWidget: (options: { url: string; parentElement: HTMLElement; config?: { layout?: { month?: number } } }) => void };
    PaystackPop?: any;
  }
}

type CalendlyMessage = { event?: string; payload?: { event?: { uri?: string }; invitee?: { uri?: string } } };

export default function BookingPage() {
  const [status, setStatus] = useState("Opening the booking calendar…");
  const [calendlyReady, setCalendlyReady] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;
  const calendlyRef = useRef<HTMLDivElement>(null);

  async function initializeAndOpenPayment() {
    try {
      // Generate a reference for this payment
      const reference = `bw_${crypto.randomUUID().replaceAll("-", "")}`;
      const email = "customer@example.com"; // You'll want to get this from Calendly if possible
      
      const response = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          eventUri: "pending", 
          inviteeUri: "pending",
          email: email 
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.accessCode) {
        console.error("Failed to initialize payment");
        return;
      }
      
      // Open Paystack inline popup using access code
      const handler = window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email: email,
        amount: process.env.NEXT_PUBLIC_PAYSTACK_AMOUNT || "1500000",
        currency: process.env.NEXT_PUBLIC_PAYSTACK_CURRENCY || "NGN",
        ref: reference,
        callback: function() {
          // Payment completed - this will be called after postMessage
          console.log("Payment callback triggered");
        },
        onClose: function() {
          console.log("Payment popup closed");
          setShowPayment(false);
          // Reload page if payment was not completed
          if (!paymentCompleted) {
            console.log("Payment not completed, reloading page...");
            window.location.reload();
          }
        }
      });
      
      handler.openIframe();
      setShowPayment(true);
      
    } catch (error) {
      console.error("Payment initialization failed", error);
    }
  }

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
      
      // When date/time selected, initialize and open Paystack inline payment
      if (message.data?.event === "calendly.date_and_time_selected") {
        const paymentCompleted = sessionStorage.getItem('payment_completed_at');
        const paymentTime = paymentCompleted ? parseInt(paymentCompleted) : 0;
        const timeSincePayment = Date.now() - paymentTime;
        
        // Only open payment if not completed in last 15 minutes
        if (!paymentCompleted || timeSincePayment > 15 * 60 * 1000) {
          console.log("Date/time selected, initializing Paystack payment...");
          initializeAndOpenPayment();
        }
      }
      
      // When event scheduled, mark payment as completed in session
      if (message.data?.event === "calendly.event_scheduled") {
        sessionStorage.setItem('payment_completed_at', Date.now().toString());
      }
    }
    window.addEventListener("message", handleScheduledEvent);
    return () => window.removeEventListener("message", handleScheduledEvent);
  }, [calendlyReady, calendlyUrl]);

  // Listen for Paystack inline checkout success events
  useEffect(() => {
    function handlePaystackMessage(message: MessageEvent) {
      if (message.origin !== "https://paystack.co") return;
      
      console.log("Paystack message:", message.data);
      
      // Check for payment success
      if (message.data?.event === "success") {
        console.log("Payment successful!");
        setPaymentSuccess(true);
        setPaymentCompleted(true);
        sessionStorage.setItem('payment_completed_at', Date.now().toString());
        
        // Auto-close after showing success message
        setTimeout(() => {
          setShowPayment(false);
          setPaymentSuccess(false);
        }, 2000);
      }
    }
    
    window.addEventListener("message", handlePaystackMessage);
    return () => window.removeEventListener("message", handlePaystackMessage);
  }, []);



  return <main style={{ margin: 0, padding: 0, width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
    <div ref={calendlyRef} style={{ width: '100%', height: '100%' }}></div>
    
    {showPayment && paymentSuccess && (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
          <h2 style={{ margin: '0 0 10px 0', color: '#00a651' }}>Payment Successful!</h2>
          <p style={{ color: '#666' }}>You can now complete your Calendly booking.</p>
        </div>
      </div>
    )}
    
    <Script src="https://assets.calendly.com/assets/external/widget.js" strategy="afterInteractive" onLoad={() => setCalendlyReady(true)} />
    <Script src="https://js.paystack.co/v2/inline.js" strategy="afterInteractive" />
  </main>;
}
