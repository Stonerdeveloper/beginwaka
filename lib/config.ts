function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const config = {
  appUrl: () => required("NEXT_PUBLIC_APP_URL").replace(/\/$/, ""),
  calendlyToken: () => required("CALENDLY_PERSONAL_ACCESS_TOKEN"),
  paystackSecretKey: () => required("PAYSTACK_SECRET_KEY"),
  paystackAmount: () => Number(required("PAYSTACK_AMOUNT")),
  paystackCurrency: () => process.env.PAYSTACK_CURRENCY ?? "NGN",
  supabaseUrl: () => required("SUPABASE_URL").replace(/\/$/, ""),
  supabaseKey: () => required("SUPABASE_SECRET_KEY"),
  cronSecret: () => required("CRON_SECRET"),
  paymentDeadlineMinutes: () => Number(process.env.PAYMENT_DEADLINE_MINUTES ?? "15"),
};
