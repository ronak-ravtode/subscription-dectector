import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Upload,
  CreditCard,
  TrendingDown,
  Mail,
  Smartphone,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";

function AnimatedCounter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);

  return <span>{count.toLocaleString("en-IN")}</span>;
}

const features = [
  {
    icon: Upload,
    title: "Upload & Scan",
    description: "Drop your bank statement PDF. We extract every transaction and find the hidden recurring charges.",
  },
  {
    icon: Smartphone,
    title: "SMS Forwarding",
    description: "Forward your bank SMS alerts. We detect subscriptions the moment money leaves your account.",
  },
  {
    icon: Mail,
    title: "Email Integration",
    description: "Connect your email. We scan statements from SBI, HDFC, ICICI, Axis, and more.",
  },
  {
    icon: TrendingDown,
    title: "Leak Score",
    description: "Every subscription gets a leak score. See exactly how much you're wasting and where.",
  },
  {
    icon: CreditCard,
    title: "Price Tracking",
    description: "We catch price increases before you do. Know when Netflix, Spotify, or Jio hikes your plan.",
  },
  {
    icon: Zap,
    title: "AI Insights",
    description: "Gemini-powered summaries tell you what to cancel, keep, or negotiate — in plain English.",
  },
];

const stats = [
  { number: 2400, suffix: "+", label: "Subscriptions Detected", prefix: "" },
  { number: 18, suffix: "L", label: "Money Saved by Users", prefix: "\u20B9" },
  { number: 94, suffix: "%", label: "Accuracy Rate", prefix: "" },
  { number: 6, suffix: "", label: "Banks Supported", prefix: "" },
];

export default function Landing() {
  const { token, isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen bg-canvas">
      {/* Nav */}
      <header className="sticky top-0 z-50 w-full bg-canvas/95 backdrop-blur-sm border-b border-hairline">
        <div className="container flex h-16 items-center justify-between">
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-ink" />
            <span className="font-bold text-lg font-heading">SubGuard</span>
          </Link>
          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button className="rounded-full bg-ink text-canvas hover:bg-charcoal">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="rounded-full">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button className="rounded-full bg-ink text-canvas hover:bg-charcoal">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero — light theme */}
      <section className="relative overflow-visible bg-soft-cloud">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(rgb(202,202,203) 1px, transparent 1px), linear-gradient(90deg, rgb(202,202,203) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="container relative min-h-[calc(100vh-4rem)] py-12 md:py-16 lg:py-20 flex items-center">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="max-w-4xl">
              {/* Eyebrow */}
              <div className="mb-6 inline-flex items-center space-x-2 rounded-full bg-canvas px-4 py-1.5 text-sm font-medium border border-hairline-soft">
                <AlertTriangle className="h-3.5 w-3.5 text-sale" />
                <span className="text-charcoal">Indians lose an average of <span className="font-mono text-ink font-semibold">{"\u20B9"}4,800/month</span> to forgotten subscriptions</span>
              </div>

              {/* Headline */}
              <h1 className="font-display text-[clamp(3rem,8vw,7rem)] leading-[0.85] tracking-tight uppercase text-ink">
                You're
                <br />
                <span className="text-sale">Leaking</span>
                <br />
                Money.
              </h1>

              {/* Sub-headline */}
              <p className="mt-8 max-w-lg text-lg text-muted-foreground leading-relaxed">
                SubGuard finds every hidden subscription, recurring charge, and forgotten plan draining your bank account — before they drain it further.
              </p>

              {/* CTAs */}
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link to="/register">
                  <Button size="lg" className="rounded-full bg-ink text-canvas hover:bg-charcoal px-8 text-base font-semibold">
                    Start Scanning Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="rounded-full border-hairline text-ink hover:bg-canvas px-8 text-base">
                    Sign In
                  </Button>
                </Link>
              </div>

              {/* Live counter */}
              <div className="mt-8 flex items-center space-x-8 border-t border-hairline pt-6">
                <div>
                  <div className="font-mono text-4xl font-bold text-sale">
                    {"\u20B9"}<AnimatedCounter target={4800} duration={1500} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">avg. monthly leak per user</p>
                </div>
                <div className="h-12 w-px bg-hairline" />
                <div>
                  <div className="font-mono text-4xl font-bold text-ink">
                    <AnimatedCounter target={73} duration={1500} />
                    <span className="text-sale">%</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">people don't know they're paying</p>
                </div>
              </div>
            </div>

            {/* Hero illustration — subscription leak cards */}
            <div className="hidden lg:flex justify-end items-center pr-0">
              <div className="relative w-full max-w-sm scale-90 translate-x-20">
                {/* Phone frame */}
                <div className="relative mx-auto w-64 rounded-[2.5rem] border-4 border-ink bg-canvas p-3 shadow-2xl">
                  {/* Notch */}
                  <div className="mx-auto mb-3 h-4 w-20 rounded-full bg-ink" />
                  {/* Screen */}
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between px-1 pb-2 border-b border-hairline-soft">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Subscriptions</span>
                      <span className="text-xs font-mono font-bold text-sale">{"\u20B9"}4,800/mo</span>
                    </div>
                    {/* Subscription cards */}
                    {[
                      { name: "Netflix", amount: "649", color: "bg-sale", icon: "N" },
                      { name: "Spotify", amount: "179", color: "bg-success", icon: "S" },
                      { name: "Jio Prime", amount: "399", color: "bg-info", icon: "J" },
                      { name: "YouTube Premium", amount: "189", color: "bg-sale", icon: "Y" },
                      { name: "Amazon Prime", amount: "179", color: "bg-charcoal", icon: "A" },
                    ].map((sub, i) => (
                      <div
                        key={sub.name}
                        className="flex items-center justify-between rounded-xl bg-soft-cloud px-3 py-2 border border-hairline-soft"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${sub.color} text-canvas text-xs font-bold`}>
                            {sub.icon}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-ink">{sub.name}</p>
                            <p className="text-xs text-muted-foreground">Monthly</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono font-bold text-ink">{"\u20B9"}{sub.amount}</p>
                          <p className="text-[10px] text-sale font-medium">Leaking</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Floating leak badge */}
                <div className="absolute -right-2 top-8 rounded-2xl bg-sale px-4 py-2 shadow-lg animate-bounce">
                  <p className="text-xs font-bold text-canvas">{"\u20B9"}1,595</p>
                  <p className="text-[9px] text-canvas/80 font-medium">wasted this month</p>
                </div>
                {/* Floating saved badge */}
                <div className="absolute -left-4 bottom-20 rounded-2xl bg-success px-4 py-2 shadow-lg">
                  <p className="text-xs font-bold text-canvas">{"\u20B9"}12,400</p>
                  <p className="text-[9px] text-canvas/80 font-medium">saved by cancelling</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-canvas to-transparent" />
      </section>

      {/* How it works */}
      <section className="py-24 md:py-32">
        <div className="container">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-sale">How It Works</p>
            <h2 className="mt-4 font-display text-[clamp(2.5rem,5vw,5rem)] leading-[0.9] uppercase">
              Three Steps.
              <br />
              Zero Leaks.
            </h2>
          </div>

          <div className="mt-16 grid gap-12 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Connect",
                desc: "Upload a bank statement PDF, forward an SMS, or connect your email. We support SBI, HDFC, ICICI, Axis, BOB, and PNB.",
              },
              {
                step: "02",
                title: "Detect",
                desc: "Our engine scans every transaction, identifies recurring patterns, and flags hidden subscriptions with confidence scoring.",
              },
              {
                step: "03",
                title: "Act",
                desc: "Get a leak score, price trend alerts, and AI-powered recommendations on what to cancel, keep, or negotiate.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <span className="font-mono text-6xl font-bold text-hairline">{item.step}</span>
                <h3 className="mt-4 text-xl font-semibold font-heading">{item.title}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-soft-cloud py-24 md:py-32">
        <div className="container">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-sale">Features</p>
            <h2 className="mt-4 font-display text-[clamp(2.5rem,5vw,5rem)] leading-[0.9] uppercase">
              Everything You
              <br />
              Need to Know.
            </h2>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-sm bg-canvas p-8 border border-hairline-soft">
                <f.icon className="h-8 w-8 text-ink" />
                <h3 className="mt-5 text-lg font-semibold font-heading">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-24 md:py-32">
        <div className="container">
          <div className="grid gap-12 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-mono text-5xl font-bold text-ink">
                  {s.prefix}
                  <AnimatedCounter target={s.number} duration={2000} />
                  {s.suffix}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-24 md:py-32">
        <div className="container text-center">
          <h2 className="font-display text-[clamp(2.5rem,6vw,6rem)] leading-[0.85] uppercase text-canvas">
            Stop Losing Money.
          </h2>
          <p className="mx-auto mt-6 max-w-md text-lg text-white/60">
            Join thousands who discovered and cancelled hidden subscriptions. It takes 30 seconds to start.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="rounded-full bg-canvas text-ink hover:bg-white/90 px-10 text-base font-semibold">
                Find Your Leaks
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="mt-8 flex items-center justify-center space-x-6 text-sm text-white/40">
            <span className="flex items-center space-x-1.5">
              <CheckCircle className="h-4 w-4 text-success-bright" />
              <span>Free to start</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <CheckCircle className="h-4 w-4 text-success-bright" />
              <span>No credit card needed</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <CheckCircle className="h-4 w-4 text-success-bright" />
              <span>Cancel anytime</span>
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hairline py-8">
        <div className="container flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
          <div className="flex items-center space-x-2 text-muted-foreground text-sm">
            <Shield className="h-4 w-4" />
            <span>SubGuard &copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            <Link to="/login" className="hover:text-ink transition-colors">Sign In</Link>
            <Link to="/register" className="hover:text-ink transition-colors">Get Started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
