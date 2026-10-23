"use client";

import { useEffect } from "react";

export default function PaymentCompletePage() {
  useEffect(() => {
    // Mark payment as completed in session storage
    sessionStorage.setItem('payment_completed_at', Date.now().toString());

    // Redirect to home page after showing success message
    setTimeout(() => {
      window.location.href = "/";
    }, 2000);
  }, []);

  return <main><p className="eyebrow">Beginwaka advisory</p><h1>Payment Successful!</h1><p>Your consultation is confirmed. Redirecting...</p></main>;
}
