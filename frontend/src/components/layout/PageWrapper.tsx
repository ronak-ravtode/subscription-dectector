import { Navbar } from "./Navbar";

interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
}

export function PageWrapper({ children, title }: PageWrapperProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {title && (
            <h1 className="mb-6 text-3xl font-bold tracking-tight">
              {title}
            </h1>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}