import type React from "react"
import "@/app/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import Script from "next/script"

export const metadata = {
  title: "TGPC Invoice Viewer",
  description: "View your painting invoice from Those Guys Painting Co.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-lexend">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
          strategy="lazyOnload"
        />
        <Script id="iframe-height-communication" strategy="afterInteractive">
          {`
          function sendHeightToParent() {
            if (window.parent && window.parent !== window) {
              const height = Math.max(
                document.body.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.clientHeight,
                document.documentElement.scrollHeight,
                document.documentElement.offsetHeight
              );
              
              // Add 10px buffer to prevent scrollbars in iframe
              const adjustedHeight = height + 10;
              
              console.log('Sending height to parent:', adjustedHeight);
              
              // Send to any parent origin (more flexible)
              window.parent.postMessage({
                type: 'resize',
                height: adjustedHeight,
                source: 'markdown-quote-design'
              }, '*');
            }
          }
          
          // Send height when page loads
          window.addEventListener('load', function() {
            console.log('Page loaded, sending initial height');
            setTimeout(sendHeightToParent, 100);
            setTimeout(sendHeightToParent, 500);
            setTimeout(sendHeightToParent, 1000);
          });
          
          // Send height when window resizes
          window.addEventListener('resize', function() {
            console.log('Window resized, sending new height');
            sendHeightToParent();
          });
          
          // Listen for height requests from parent
          window.addEventListener('message', function(event) {
            console.log('Received message from parent:', event.data);
            if (event.data.type === 'getHeight') {
              sendHeightToParent();
            }
          });
          
          // Send height periodically to handle dynamic content
          setInterval(sendHeightToParent, 2000);
          
          // Use MutationObserver to detect content changes
          if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver(function(mutations) {
              let shouldUpdate = false;
              mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                  shouldUpdate = true;
                }
              });
              if (shouldUpdate) {
                console.log('DOM changed, sending new height');
                setTimeout(sendHeightToParent, 100);
              }
            });
            
            observer.observe(document.body, {
              childList: true,
              subtree: true,
              attributes: true,
              attributeFilter: ['style', 'class']
            });
          }
          
          // Send initial height immediately
          setTimeout(sendHeightToParent, 50);
        `}
        </Script>
      </body>
    </html>
  )
}
