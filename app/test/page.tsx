"use client"

import { useState } from "react"
import { formatCurrency } from "@/lib/utils"
import { parseMarkdown } from "@/lib/markdown-parser"

// Sample webhook response from the user
const SAMPLE_WEBHOOK_RESPONSE = `invoiceNo=Invoice%20%23315&name=Andre%20Viruez&date=Jul 21 2025&billingAddress=1200%20Broadway%2C%20Nashville%2C%20Tennessee%2C%20United%20States&content=**INVOICE%20%23315**%0A%0A**CLIENT%20INFORMATION**%0AName%3A%20Andre%20Viruez%20%20%0APhone%3A%20(305)%20877-6268%20%20%0AEmail%3A%20andre.viruez%40yahoo.com%20%20%0AAddress%3A%201200%20Broadway%2C%20Nashville%2C%20Tennessee%0A%0A**SCOPE%20OF%20WORK**%0A-%20Correction%20and%20preparation%20of%20previous%20poor%20work%20%20%0A-%20Specialized%20silicone%20glazing%20compound%20treatment%20%20%0A-%201.5%20additional%20coats%20of%20your%20Behr%20Premium%20direct-to-metal%20paint%20%20%0A-%20Living%20room%20and%20bedroom%20window%20frames%20(11-foot%20ceilings)%20%20%0A-%20Professional%20sanding%20and%20correction%20of%20existing%20work%20%20%0A-%20Specialized%20silicone%20glazing%20compound%20preparation%20(light%20scuff%20sand%20%2B%20alcohol%20cleaning)%20%20%0A-%20Universal%20bonding%20primer%20application%20on%20prepared%20silicone%20surfaces%20%20%0A-%20Expert%20application%20using%20your%20premium%20direct-to-metal%20paint%20%20%0A-%20Proper%20brush%20and%20roller%20technique%20for%20smooth%20finish%20%20%0A-%20Complete%20masking%20and%20surface%20protection%20%20%0A-%20Final%20inspection%20and%20touch-ups%20%20%0A-%2030-day%20workmanship%20guarantee%0A%0A**ADDITIONAL%20WORK**%0A%0A&stripePaymentIntent=https%3A%2F%2Fbuy.stripe.com%2F14AeVe5Nha5WaYi4Bi9fW0D&originalQuote=1009.37&additionalTotal=&totalDue=1009.37&subtotal=1009.37&depositPaid=504.69&finalBalance=504.68`

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
  originalQuote: number // Added originalQuote
  finalBalance: number // Added finalBalance
}

export default function TestPage() {
  const [parsedData, setParsedData] = useState<QuoteData | null>(null)
  const [rawMarkdown, setRawMarkdown] = useState("")
  const [parsedMarkdown, setParsedMarkdown] = useState("")

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
    data.originalQuote = Number.parseFloat(params.get("originalQuote") || "0") || 0 // Parse originalQuote
    data.finalBalance = Number.parseFloat(params.get("finalBalance") || "0") || 0 // Parse finalBalance

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

  const handleTestParsing = () => {
    const parsed = parseUrlEncodedResponse(SAMPLE_WEBHOOK_RESPONSE)
    setParsedData(parsed)
    setRawMarkdown(parsed.markdown)
    setParsedMarkdown(parseMarkdown(parsed.markdown, parsed.additionalTotal))
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Webhook Response Parser Test</h1>

        <button
          onClick={handleTestParsing}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg mb-8"
        >
          Test Parsing
        </button>

        {parsedData && (
          <div className="space-y-8">
            {/* Basic Fields */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Basic Fields</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Invoice Number:</strong> {parsedData.quoteNumber}
                </div>
                <div>
                  <strong>Customer Name:</strong> {parsedData.customerName}
                </div>
                <div>
                  <strong>Date:</strong> {parsedData.date}
                </div>
                <div>
                  <strong>Address:</strong> {parsedData.customerAddress}
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Pricing Information</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <strong>Original Invoice:</strong> {formatCurrency(parsedData.originalQuote)}
                </div>
                <div>
                  <strong>Subtotal:</strong> {formatCurrency(parsedData.subtotal)}
                </div>
                <div>
                  <strong>Deposit:</strong> {formatCurrency(parsedData.depositValue)}
                </div>
                <div>
                  <strong>Total:</strong> {formatCurrency(parsedData.total)}
                </div>
                <div>
                  <strong>Additional Total:</strong> {formatCurrency(parsedData.additionalTotal)}
                </div>
                <div>
                  <strong>Final Balance:</strong> {formatCurrency(parsedData.finalBalance)}
                </div>
              </div>
            </div>

            {/* Payment Link */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Payment Information</h2>
              <div>
                <strong>Stripe Payment Intent:</strong>
                <br />
                <a
                  href={parsedData.stripePaymentIntent}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {parsedData.stripePaymentIntent}
                </a>
              </div>
            </div>

            {/* Raw Markdown */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Raw Markdown Content</h2>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto whitespace-pre-wrap">
                {rawMarkdown.substring(0, 1000)}...
              </pre>
            </div>

            {/* Parsed Markdown Preview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Parsed Markdown Preview</h2>
              <div
                className="prose prose-lg max-w-none markdown-content border p-4 rounded"
                dangerouslySetInnerHTML={{ __html: parsedMarkdown }}
              />
            </div>

            {/* Debug Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Markdown Length:</strong> {rawMarkdown.length} characters
                </div>
                <div>
                  <strong>Services Count:</strong> {parsedData.services.length}
                </div>
                <div>
                  <strong>Overview Empty:</strong>{" "}
                  {parsedData.overview === "Professional painting services tailored to your needs."
                    ? "Yes (using fallback)"
                    : "No"}
                </div>
                <div>
                  <strong>Conclusion Empty:</strong>{" "}
                  {parsedData.conclusion ===
                  "Thank you for choosing Those Guys Painting Co. We look forward to transforming your space!"
                    ? "Yes (using fallback)"
                    : "No"}
                </div>
              </div>
            </div>

            {/* Regex Test Results */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Regex Extraction Test</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Deposit Regex Match:</strong>{" "}
                  {rawMarkdown.match(/\*\*Deposit\s+Required[^$]*?\$([0-9,]+\.?\d*)/i)?.[1] || "No match"}
                </div>
                <div>
                  <strong>Total Regex Match:</strong>{" "}
                  {rawMarkdown.match(/\*\*TOTAL[^$]*?\$([0-9,]+\.?\d*)/i)?.[1] || "No match"}
                </div>
                <div>
                  <strong>Subtotal Regex Match:</strong>{" "}
                  {rawMarkdown.match(/\*\*Subtotal[^$]*?\$([0-9,]+\.?\d*)/i)?.[1] || "No match"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
