import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Upload, Sparkles, Receipt } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export function DashboardHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <motion.div 
      ref={containerRef}
      style={{ opacity, y }}
      className="relative w-full min-h-[750px] bg-white overflow-hidden flex items-center justify-center pt-24 pb-16 px-4 md:px-8 border-b border-slate-100"
    >
      {/* Background Typography */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none flex items-center justify-center">
        <div className="absolute top-[10%] left-[-5%] text-[14vw] font-black text-slate-900/[0.03] leading-none tracking-tighter mix-blend-multiply filter blur-[1px]">
          ANALYZE
        </div>
        <div className="absolute top-[30%] right-[-10%] text-[16vw] font-black text-slate-900/[0.03] leading-none tracking-tighter mix-blend-multiply filter blur-[1px]">
          DETECT
        </div>
        <div className="absolute top-[55%] left-[5%] text-[15vw] font-black text-accent/[0.03] leading-none tracking-tighter mix-blend-multiply filter blur-[1px]">
          TRACK
        </div>
        <div className="absolute bottom-[5%] right-[0%] text-[18vw] font-black text-slate-900/[0.03] leading-none tracking-tighter mix-blend-multiply filter blur-[1px]">
          SAVE
        </div>
        
        {/* Soft Radial Gradient Lighting */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/[0.04] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-[1440px] w-full grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
        {/* Left Column: Typography & CTA */}
        <div className="flex flex-col items-start justify-center text-left lg:pr-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20"
          >
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-xs font-bold text-accent uppercase tracking-widest">
              AI-Powered Subscription Intelligence
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-[84px] font-extrabold tracking-tight text-primary leading-[1.05] mb-8"
          >
            Stop Paying <br />
            For Forgotten <br />
            <span className="text-accent">Subscriptions.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed max-w-[500px] mb-10"
          >
            Automatically detect recurring payments, identify hidden leaks, and stop wasting money before your next billing cycle.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          >
            <Button 
              asChild 
              size="lg" 
              className="h-14 px-8 rounded-2xl text-base font-semibold shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30 transition-all hover:-translate-y-1 bg-accent hover:bg-accent/90 text-white"
            >
              <Link to="/upload">
                <Upload className="mr-3 h-5 w-5" />
                Upload Statement
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Right Column: Floating Bank Statement & Icons */}
        <div className="relative h-[600px] w-full hidden lg:flex items-center justify-center perspective-[2000px]">
          
          {/* Main Floating Bank Statement */}
          <motion.div
            initial={{ opacity: 0, rotateY: -10, rotateX: 10, scale: 0.9 }}
            animate={{ opacity: 1, rotateY: -5, rotateX: 5, scale: 1, y: [-10, 10, -10] }}
            transition={{ 
              opacity: { duration: 1, ease: "easeOut" },
              rotateY: { duration: 1, ease: "easeOut" },
              rotateX: { duration: 1, ease: "easeOut" },
              scale: { duration: 1, ease: "easeOut" },
              y: { duration: 6, repeat: Infinity, ease: "easeInOut" }
            }}
            className="relative w-[380px] h-[520px] bg-white rounded-xl shadow-2xl border border-slate-100 p-8 transform-style-3d overflow-hidden"
            style={{ 
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15), 0 -10px 30px rgba(0,0,0,0.02), 40px 0px 80px -20px rgba(37,99,235,0.15)"
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-6">
              <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <Receipt className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 tracking-tight">BANK STATEMENT</h3>
                <p className="text-xs text-slate-400 font-medium">MAY 1 - MAY 31, 2024</p>
              </div>
            </div>

            {/* Content Mockup */}
            <div className="space-y-4">
              {[
                { name: "Netflix.com", amount: "$15.49", icon: <div className="w-6 h-6 rounded bg-red-100 flex items-center justify-center text-red-600 font-bold text-[10px]">N</div> },
                { name: "Spotify Premium", amount: "$9.99", icon: <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-[10px]">S</div> },
                { name: "Adobe Creative Cloud", amount: "$52.99", icon: <div className="w-6 h-6 rounded bg-red-50 flex items-center justify-center text-red-600 font-bold text-[10px]">A</div> },
                { name: "Microsoft 365", amount: "$6.99", icon: <div className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-[10px]">M</div> },
                { name: "Amazon Prime", amount: "$14.99", icon: <div className="w-6 h-6 rounded bg-sky-50 flex items-center justify-center text-sky-600 font-bold text-[10px]">a</div> },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-slate-50 pb-3">
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{item.name}</p>
                      <p className="text-[10px] text-slate-400">May {10 + i}, 2024</p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-medium text-slate-600">{item.amount}</span>
                </div>
              ))}
            </div>

            {/* Animated AI Scanning Beam */}
            <motion.div
              animate={{ top: ["15%", "85%", "15%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-[2px] bg-accent/80 shadow-[0_0_20px_4px_rgba(37,99,235,0.4)] z-20 pointer-events-none"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent to-transparent opacity-80" />
            </motion.div>
          </motion.div>

          {/* Floating Icons Around Statement */}
          <motion.div 
            animate={{ y: [-15, 15, -15], rotate: [-2, 2, -2] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute top-10 left-[10%] w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-slate-100 z-20"
          >
             <div className="w-10 h-10 rounded bg-red-600 flex items-center justify-center text-white font-black text-2xl">N</div>
          </motion.div>

          <motion.div 
            animate={{ y: [15, -15, 15], rotate: [2, -2, 2] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-[40%] -left-[5%] w-14 h-14 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-slate-100 z-20"
          >
             <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-black text-xl">S</div>
          </motion.div>

          <motion.div 
            animate={{ y: [-10, 10, -10], rotate: [-5, 5, -5] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
            className="absolute bottom-20 left-[5%] w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center border border-slate-100 z-20"
          >
             <div className="text-sky-500 font-bold text-lg flex items-center gap-1">
               <span className="text-xl">a</span> prime
             </div>
          </motion.div>

          <motion.div 
            animate={{ y: [20, -20, 20], rotate: [5, -5, 5] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            className="absolute top-[15%] right-[5%] w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-slate-100 z-20"
          >
             <div className="w-10 h-10 bg-red-600 flex items-center justify-center text-white font-bold text-2xl rounded-sm">A</div>
          </motion.div>

          <motion.div 
            animate={{ y: [-20, 20, -20], rotate: [-2, 2, -2] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            className="absolute top-[45%] right-[-10%] w-14 h-14 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-slate-100 z-20"
          >
             <div className="w-8 h-8 bg-red-500 flex items-center justify-center text-white rounded-md">
               <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M21.582 6.186a2.6 2.6 0 0 0-1.828-1.841C18.141 3.9 12 3.9 12 3.9s-6.141 0-7.754.445A2.6 2.6 0 0 0 2.418 6.186C2 7.82 2 12 2 12s0 4.18.418 5.814a2.6 2.6 0 0 0 1.828 1.841c1.613.445 7.754.445 7.754.445s6.141 0 7.754-.445a2.6 2.6 0 0 0 1.828-1.841c.418-1.634.418-5.814.418-5.814s0-4.18-.418-5.814ZM9.957 15.228V8.772l5.65 3.228-5.65 3.228Z"/></svg>
             </div>
          </motion.div>

          <motion.div 
            animate={{ y: [10, -10, 10], rotate: [5, -5, 5] }}
            transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
            className="absolute bottom-10 right-[15%] w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-slate-100 z-20"
          >
             <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white">
               <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 2C6.477 2 2 6.477 2 12c0 5.522 4.477 10 10 10s10-4.478 10-10c0-5.523-4.477-10-10-10zm4.238 14.453c-.195.32-.605.426-.921.23-2.527-1.543-5.707-1.89-9.45-.96-.367.09-.738-.133-.828-.5-.09-.367.133-.738.5-.828 4.093-1.02 7.617-.617 10.469 1.125.316.195.422.605.23.933zm1.336-3.136c-.246.4-1.023.515-1.41.273-2.883-1.77-7.293-2.285-10.457-1.25-.453.148-.934-.098-1.082-.555-.148-.457.098-.937.555-1.086 3.652-1.19 8.523-.625 11.836 1.414.398.242.82.723.558 1.204zm.129-3.324C14.28 8.043 8.281 7.844 4.82 8.89c-.535.16-1.101-.14-1.261-.675-.16-.535.14-1.101.676-1.261 4.02-1.215 10.652-.985 14.718 1.425.48.286.637.903.351 1.383-.285.48-.902.637-1.382.351h-.219z"/></svg>
             </div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}
