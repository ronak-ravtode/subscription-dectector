import { Navbar } from "./Navbar";
import { ReactNode } from "react";

interface PageWrapperProps {
  children: ReactNode;
  title?: string;
  hero?: ReactNode;
}

export function PageWrapper({ children, title, hero }: PageWrapperProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      {hero && (
        <div className="w-full mt-4">
          {hero}
        </div>
      )}
      <main className="flex-1 flex flex-col items-center w-full mt-4">
        <div className="w-full max-w-[1440px] px-4 md:px-8 py-8 md:py-12">
          {title && (
            <h1 className="mb-2 text-4xl font-bold tracking-tight text-primary md:text-[44px] leading-tight">
              {title}
            </h1>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}