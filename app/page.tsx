"use client"

import { useEffect, useState, useMemo } from "react"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Clock, DollarSign, FileText, RefreshCw } from "lucide-react"
import { parseMarkdown } from "@/lib/markdown-parser"

// Add this import for PDF generation
declare global {
  interface Window {
    html2pdf: any
  }
}

interface ServiceItem {
  serviceTitle: string
  serviceDescription: string
  servicePrice: number
  serviceCategory?: string
}

interface QuoteData {
  quoteNumber: string
  customerName: string
  customerAddress: string
  depositValue: number
  total: number
  subtotal: number
  stripePaymentIntent: string
  services: ServiceItem[]
  markdown: string
  overview: string
  conclusion: string
  date: string
  additionalTotal: number
  originalQuote: number
  finalBalance: number
}

// FIXED: Remove searchParams prop and use window.location.search like the working quote page
export default function QuotePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [invoiceData, setInvoiceData] = useState<QuoteData | null>(null)
  const MAKE_WEBHOOK_URL = "https://hook.us2.make.com/26sw7krr25h2tpw605bwj7psuqv18w5q"
  const REQUEST_TIMEOUT = 30000 // 30 seconds

  useEffect(() => {
    initializePage()
  }, []) // FIXED: Remove searchParams dependency

  // FIXED: Use the same pattern as the working quote page
  function extractIdFromUrl() {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      return urlParams.get("id")
    }
    return null
  }

  // FIXED: Use the same pattern as the working quote page
  function extractLogoFromUrl() {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      return urlParams.get("logo")
    }
    return null
  }

  function parseUrlEncodedResponse(responseText: string) {
    const params = new URLSearchParams(responseText)
    const data: Partial<QuoteData> = {}

    data.quoteNumber = params.get("invoiceNo") || ""
    data.customerName = params.get("name") || ""
    data.customerAddress = params.get("billingAddress") || ""

    data.depositValue = Number.parseFloat(params.get("depositPaid") || "0") || 0
    data.total = Number.parseFloat(params.get("totalDue") || "0") || 0
    data.subtotal = Number.parseFloat(params.get("subtotal") || "0") || 0
    data.additionalTotal = Number.parseFloat(params.get("additionalTotal") || "0") || 0
    data.originalQuote = Number.parseFloat(params.get("originalQuote") || "0") || 0
    data.finalBalance = Number.parseFloat(params.get("finalBalance") || "0") || 0

    data.stripePaymentIntent = params.get("stripePaymentIntent") || ""

    if (data.stripePaymentIntent && data.stripePaymentIntent.includes("%")) {
      try {
        data.stripePaymentIntent = decodeURIComponent(data.stripePaymentIntent)
      } catch (e) {
        console.error("Error decoding stripe payment intent:", e)
      }
    }

    data.markdown = params.get("content") || ""

    data.services = []

    data.overview = params.get("overview") || "Professional painting services tailored to your needs."
    data.conclusion =
      params.get("conclusion") ||
      "Thank you for choosing Those Guys Painting Co. We look forward to transforming your space!"
    data.date =
      params.get("date") ||
      new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })

    return data as QuoteData
  }

  async function pingMakeWebhook(id: string) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
      const response = await fetch(`/api/invoice?id=${encodeURIComponent(id)}`, {
        method: "GET",
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const responseText = await response.text()
      return parseUrlEncodedResponse(responseText)
    } catch (error) {
      console.error("Error fetching invoice data:", error)
      throw error
    }
  }

  async function initializePage() {
    const invoiceId = extractIdFromUrl()

    if (!invoiceId) {
      console.log("No invoice ID found")
      setError(true)
      setLoading(false)
      return
    }

    try {
      const fetchedInvoiceData = await pingMakeWebhook(invoiceId)
      setInvoiceData(fetchedInvoiceData)
      setLoading(false)
    } catch (error) {
      console.error("Failed to load invoice:", error)
      setError(true)
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingState />
  }

  if (error || !invoiceData) {
    return <ErrorState onRetry={() => window.location.reload()} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div id="invoice-content">
        {invoiceData && <InvoiceDisplay invoiceData={invoiceData} logoUrl={extractLogoFromUrl()} />}
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="animate-spin w-12 h-12 mb-4">
        <RefreshCw className="w-12 h-12 text-primary" />
      </div>
      <h3 className="text-xl font-medium text-gray-700">Invoice loading...</h3>
      <p className="text-gray-500 mt-2">Please wait while we retrieve your invoice details.</p>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
          <FileText className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Invoice Not Found</h3>
        <p className="text-gray-600 mb-6">Sorry, we couldn't load your invoice. The link may be invalid or expired.</p>
        <Button onClick={onRetry} className="w-full">
          Try Again
        </Button>
      </div>
    </div>
  )
}

function downloadInvoicePDF(invoiceData: QuoteData) {
  const element = document.getElementById("invoice-content")
  if (!element) return

  const opt = {
    margin: 0.5,
    filename: `TGPC-Invoice-${invoiceData.quoteNumber}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
    },
    jsPDF: {
      unit: "in",
      format: "letter",
      orientation: "portrait",
    },
  }

  const elementsToHide = document.querySelectorAll(".no-pdf")
  elementsToHide.forEach((el) => {
    ;(el as HTMLElement).style.display = "none"
  })

  if (window.html2pdf) {
    window
      .html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => {
        elementsToHide.forEach((el) => {
          ;(el as HTMLElement).style.display = ""
        })
      })
  } else {
    console.error("html2pdf library not loaded")
    alert("PDF generation is not available. Please try again later.")
  }
}

function InvoiceDisplay({
  invoiceData,
  logoUrl,
}: {
  invoiceData: QuoteData
  logoUrl: string | null
}) {
  // FIXED: Use useMemo to prevent re-calculating on every render
  const invoiceId = useMemo(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      return urlParams.get("id")
    }
    return null
  }, [])
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white py-10 px-6 sm:px-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between">
          <div className="flex flex-col items-center sm:items-start mb-4 sm:mb-0">
            {logoUrl ? (
              <img src={logoUrl || "/placeholder.svg"} alt="Company Logo" className="h-16 mb-2 object-contain" />
            ) : (
              <h1 className="text-3xl font-bold mb-1">THOSE GUYS PAINTING CO.</h1>
            )}
            <div className="text-lg font-medium opacity-90">{invoiceData.quoteNumber}</div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => downloadInvoicePDF(invoiceData)}
              className="no-pdf bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Download PDF
            </button>
            <div className="flex items-center text-sm opacity-75">
              <Clock className="w-4 h-4 mr-1" /> {invoiceData.date}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          {/* Services Section - Markdown Content Only */}
          <div className="py-8 border-b border-gray-200">
            {invoiceData.markdown ? (
              <div
                className="prose prose-lg max-w-none mb-8 markdown-content"
                dangerouslySetInnerHTML={{
                  __html: parseMarkdown(invoiceData.markdown, invoiceData.additionalTotal),
                }}
              />
            ) : (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                  <DollarSign className="w-6 h-6 mr-2 text-primary" />
                  Services & Details
                </h2>
                {invoiceData.services.map((service, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-semibold text-gray-900">{service.serviceTitle}</h3>
                        <div className="text-2xl font-bold text-emerald-600">
                          {formatCurrency(service.servicePrice)}
                        </div>
                      </div>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line">{service.serviceDescription}</p>
                      {service.serviceCategory && service.serviceCategory.trim() !== "" && (
                        <div className="mt-3">
                          <span className="inline-block bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
                            {service.serviceCategory}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pricing Summary - Always show this section, but values come from webhook */}
            <div className="mt-8 bg-white rounded-lg p-6 max-w-lg ml-auto shadow-sm">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Original Invoice</span>
                <span className="font-medium text-gray-900">{formatCurrency(invoiceData.originalQuote)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">{formatCurrency(invoiceData.subtotal)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Deposit Paid</span>
                <span className="font-medium text-red-600">-{formatCurrency(invoiceData.depositValue)}</span>
              </div>
              <div className="flex justify-between py-3 mt-2 text-lg font-semibold border-b border-gray-200">
                <span className="text-gray-900">Total Due</span>
                <span className="text-gray-900">{formatCurrency(invoiceData.total)}</span>
              </div>
              <div className="flex justify-between py-3 mt-2 text-lg font-semibold bg-blue-50 px-3 rounded">
                <span className="text-blue-800">Final Balance</span>
                <span className="text-blue-800">{formatCurrency(invoiceData.finalBalance)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Section - Add no-pdf class */}
      <div className="no-pdf bg-gradient-to-r from-slate-800 to-slate-700 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="text-center md:text-left mb-6 md:mb-0">
            <div className="text-3xl font-bold mb-2">{formatCurrency(invoiceData.finalBalance)}</div>
            <div className="text-lg opacity-90">Final Balance Due</div>
          </div>
          <div className="flex flex-col items-center">
            <a
              href={invoiceData.stripePaymentIntent || `/pay?id=${invoiceId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-10 py-4 rounded-lg transition-all transform hover:-translate-y-1 hover:shadow-lg text-lg"
            >
              Pay Final Balance
            </a>
            <div className="mt-4">
              <a
                href="https://www.tgpcquotes.com/terms-and-conditions"
                target="_blank"
                className="text-gray-300 hover:text-white underline text-sm"
                rel="noreferrer"
              >
                Terms and Conditions
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
