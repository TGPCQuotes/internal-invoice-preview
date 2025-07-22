import { NextResponse } from "next/server"

const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL || "https://hook.us2.make.com/26sw7krr25h2tpw605bwj7psuqv18w5q"
const REQUEST_TIMEOUT = 30000 // 30 seconds

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  console.log(`[API] Received request for invoice ID: ${id}`)
  console.log(`[API] MAKE_WEBHOOK_URL being used: ${MAKE_WEBHOOK_URL}`)

  if (!id) {
    console.error("[API] Invoice ID is missing.")
    return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 })
  }

  try {
    const webhookUrl = `${MAKE_WEBHOOK_URL}?id=${encodeURIComponent(id)}`
    console.log(`[API] Attempting to fetch from webhook: ${webhookUrl}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    const response = await fetch(webhookUrl, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "text/plain, application/x-www-form-urlencoded, */*",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      // fetch will follow redirects by default
    })
    clearTimeout(timeoutId)

    console.log(`[API] Webhook final response status: ${response.status}`)
    console.log(`[API] Webhook final response URL: ${response.url}`)

    const responseText = await response.text()
    console.log(`[API] Webhook raw response text (first 200 chars): "${responseText.substring(0, 200)}..."`)

    // Check for the specific "Redirecting..." response from Make.com
    if (responseText.trim() === "Redirecting...") {
      console.error(
        "[API] Make.com webhook returned 'Redirecting...'. This indicates the webhook is not configured to return data.",
      )
      return NextResponse.json(
        {
          error:
            "Make.com webhook returned 'Redirecting...'. Please ensure your Make.com scenario is configured to return the invoice data as its final response.",
        },
        { status: 500 },
      )
    }

    if (!response.ok) {
      const contentType = response.headers.get("content-type") || "unknown"
      const truncatedErrorText = responseText.substring(0, 200) // Truncate for logs
      console.error(
        `[API] Webhook HTTP error after following redirects! Status: ${response.status}, Content-Type: ${contentType}, Response: "${truncatedErrorText}..."`,
      )
      return NextResponse.json(
        {
          error: `Failed to fetch invoice data from webhook: ${response.status} - ${response.statusText}. Raw response: "${truncatedErrorText}..."`,
        },
        { status: response.status },
      )
    }

    console.log(`[API] Successfully fetched data from webhook. Response length: ${responseText.length}`)
    return new NextResponse(responseText, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    })
  } catch (error: any) {
    console.error("[API] Error during webhook fetch:", error)
    if (error.name === "AbortError") {
      return NextResponse.json({ error: "Request to invoice data webhook timed out." }, { status: 504 })
    }
    return NextResponse.json({ error: `Internal server error: ${error.message || "Unknown error"}` }, { status: 500 })
  }
}
