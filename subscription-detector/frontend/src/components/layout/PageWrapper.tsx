import { Navbar } from "./Navbar";

interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function PageWrapper({ children, title, description }: PageWrapperProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-section max-w-6xl">
          {title && (
            <div className="mb-section">
              <h1 className="text-3xl font-medium tracking-tight font-heading">
                {title}
              </h1>
              {description && (
                <p className="mt-2 text-mute">
                  {description}
                </p>
              )}
            </div>
          )}
          <div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
