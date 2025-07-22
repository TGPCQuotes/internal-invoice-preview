// Enhanced markdown to HTML parser for the specific webhook response format
export function parseMarkdown(markdown: string, additionalTotal = 0): string {
  if (!markdown) return ""

  let html = markdown

  // Step 0: Remove the company header since it's redundant
  // Updated regex to match both "QUOTE" and "INVOICE"
  html = html.replace(/^#\s+(?:QUOTE|INVOICE)\s+[#\d]+\s*\n\s*\n\*\*CLIENT\s+INFORMATION\*\*\s*\n/im, "")

  // Step 0.5: Conditionally remove "ADDITIONAL WORK" section if additionalTotal is 0
  if (additionalTotal === 0) {
    // This regex targets the bolded "ADDITIONAL WORK" and any content until the next bolded section or header or end of string.
    html = html.replace(/\*\*ADDITIONAL\s+WORK\*\*\s*([\s\S]*?)(?=\n\s*\*\*|\n\s*#|$)/im, "")
  }

  // Step 1: Handle tables first (most complex block element)
  html = processTables(html)

  // Step 2: Clean up any remaining markdown table syntax
  html = cleanupRemainingTables(html)

  // Step 3: Handle headers
  html = processHeaders(html)

  // Step 4: Handle horizontal rules
  html = processHorizontalRules(html)

  // Step 5: Handle lists (improved approach)
  html = processLists(html)

  // Step 6: Handle inline formatting (excluding prices, which are handled elsewhere)
  html = processInlineFormatting(html)

  // Step 7: Handle special pricing sections (summary)
  html = processPricingSummary(html)

  // Step 8: Final text processing
  html = processFinalText(html)

  return html
}

function processTables(html: string): string {
  // More flexible pattern that captures the entire table section
  const tableSectionPattern = /## DETAILED LINE ITEMS\s*\n\s*\n[\s\S]*?(?=\n\s*##|\n\s*\*\*|$)/gi

  return html.replace(tableSectionPattern, (match) => {
    // Extract all lines that look like table rows (contain |)
    const lines = match.split("\n")
    const tableRows = lines.filter((line) => {
      const trimmed = line.trim()
      return trimmed.includes("|") && !trimmed.match(/^\s*\|[\s\-:]*\|[\s\-:]*\|[\s\-:]*\|[\s\-:]*\|[\s\-:]*\|\s*$/) // Skip separator rows
    })

    if (tableRows.length < 2) return match // Need at least header + 1 data row

    // Skip the header row and process data rows
    const dataRows = tableRows.slice(1)

    if (dataRows.length === 0) return match // No valid data rows found

    let tableHtml = '<h2 class="text-xl font-semibold text-gray-900 mt-8 mb-4">DETAILED LINE ITEMS</h2>'
    tableHtml += '<div class="overflow-x-auto mb-8">' // Outer container for scroll on small screens if needed

    // Desktop table header (visible only on md and up)
    tableHtml += `
    <div class="hidden md:grid md:grid-cols-[0.5fr_2fr_0.5fr_1fr_1fr] bg-gray-100 border border-gray-200 rounded-t-lg font-medium text-gray-700 text-sm">
      <div class="py-3 px-4 text-left">Item</div>
      <div class="py-3 px-4 text-left">Description</div>
      <div class="py-3 px-4 text-left">Qty</div>
      <div class="py-3 px-4 text-left">Unit Price</div>
      <div class="py-3 px-4 text-left">Total Price</div>
    </div>
  `

    // Process each data row
    dataRows.forEach((row: string, index: number) => {
      // Split by '|' and clean up cells - be more careful with the parsing
      const allCells = row.split("|")
      // Remove empty first and last cells (from leading/trailing |)
      const cells = allCells.slice(1, -1).map((cell) => cell.trim())

      if (cells.length >= 5) {
        // Process bold text and <br> tags within description cell
        const description = cells[1]
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
          .replace(/<br>/g, '<br class="md:hidden">')

        const item = cells[0]
        const qty = cells[2]
        const unitPrice = cells[3] // e.g., "$881.10"
        const totalPrice = cells[4] // e.g., "$881.10"

        // Responsive row/card structure
        tableHtml += `
        <div class="detailed-line-item-row ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} border-b border-gray-200 last:border-b-0 md:grid md:grid-cols-[0.5fr_2fr_0.5fr_1fr_1fr] md:items-start md:py-3 md:px-4">
          <div class="p-4 md:p-0 md:border-none border-b border-gray-200 md:hidden">
            <span class="font-semibold text-gray-600 block md:hidden">Item:</span>
            <span class="text-gray-700">${item}</span>
          </div>
          <div class="p-4 md:p-0 md:border-none border-b border-gray-200">
            <span class="font-semibold text-gray-600 block md:hidden">Description:</span>
            <span class="text-gray-700">${description}</span>
          </div>
          <div class="p-4 md:p-0 md:border-none border-b border-gray-200">
            <span class="font-semibold text-gray-600 block md:hidden">Qty:</span>
            <span class="text-gray-700">${qty}</span>
          </div>
          <div class="p-4 md:p-0 md:border-none border-b border-gray-200">
            <span class="font-semibold text-gray-600 block md:hidden">Unit Price:</span>
            <span class="font-bold text-emerald-600 text-lg">${unitPrice}</span>
          </div>
          <div class="p-4 md:p-0 md:border-none">
            <span class="font-semibold text-gray-600 block md:hidden">Total Price:</span>
            <span class="font-bold text-emerald-600 text-lg">${totalPrice}</span>
          </div>
        </div>
      `
      }
    })

    tableHtml += "</div>" // Close overflow-x-auto div
    return tableHtml
  })
}

function cleanupRemainingTables(html: string): string {
  // Remove any remaining markdown table syntax that wasn't processed
  return html.replace(/\|.*\|[\s\S]*?(?=\n\s*[^|]|\n\s*$|$)/g, "")
}

function processHeaders(html: string): string {
  html = html.replace(/^#### (.*$)/gim, '<h4 class="text-base font-semibold text-gray-900 mt-4 mb-2">$1</h4>')
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-gray-900 mt-8 mb-4">$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-6">$1</h1>')
  return html
}

function processHorizontalRules(html: string): string {
  return html.replace(/^-{3,}$/gim, '<hr class="my-8 border-t border-gray-200" />')
}

function processLists(html: string): string {
  // Split into blocks and process each block
  const blocks = html.split(/\n\s*\n/)
  const processedBlocks: string[] = []

  for (const block of blocks) {
    const lines = block.split("\n")
    const listItems: string[] = []
    const nonListLines: string[] = []

    let inList = false

    for (const line of lines) {
      const trimmedLine = line.trim()

      if (trimmedLine.startsWith("- ")) {
        inList = true
        // Remove the '- ' and process the content
        const content = trimmedLine.substring(2)
        listItems.push(content)
      } else if (inList && trimmedLine === "") {
        // Empty line in list, continue
        continue
      } else {
        // Not a list item
        if (inList) {
          // End of list, process accumulated items
          const listHtml = createListHtml(listItems)
          nonListLines.push(listHtml)
          listItems.length = 0
          inList = false
        }
        nonListLines.push(line)
      }
    }

    // Handle case where block ends with a list
    if (inList && listItems.length > 0) {
      const listHtml = createListHtml(listItems)
      nonListLines.push(listHtml)
    }

    processedBlocks.push(nonListLines.join("\n"))
  }

  return processedBlocks.join("\n\n")
}

function createListHtml(items: string[]): string {
  if (items.length === 0) return ""

  let listHtml = '<ul class="mb-4 space-y-2 list-none">'

  for (const item of items) {
    // Process bold text and pricing within each list item
    const processedItem = item
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      .replace(/\$([0-9,]+\.?\d*)/g, '<span class="font-bold text-emerald-600 text-lg">$$1</span>')

    listHtml += `<li class="flex items-start ml-4"><span class="text-emerald-600 mr-2 mt-1">•</span><span class="flex-1">${processedItem}</span></li>`
  }

  listHtml += "</ul>"
  return listHtml
}

function processInlineFormatting(html: string): string {
  // Handle bold text (but not in areas we've already processed)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')

  return html
}

function processPricingSummary(html: string): string {
  // Handle pricing summary sections
  html = html.replace(
    /\*\*Subtotal:\*\*\s+(\$[0-9,]+\.?\d*)/g,
    '<div class="flex justify-between py-2 border-b border-gray-200"><span class="text-gray-600">Subtotal:</span><span class="font-medium">$1</span></div>',
  )

  html = html.replace(
    /\*\*Tax:\*\*\s+(\$[0-9,]+\.?\d*)/g,
    '<div class="flex justify-between py-2 border-b border-gray-200"><span class="text-gray-600">Tax:</span><span class="font-medium">$1</span></div>',
  )

  html = html.replace(
    /\*\*TOTAL:\*\*\s+(\$[0-9,]+\.?\d*)/g,
    '<div class="flex justify-between py-3 mt-2 text-lg font-semibold"><span>Total:</span><span class="text-emerald-600">$1</span></div>',
  )

  html = html.replace(
    /\*\*Deposit Required.*?\*\*\s+(\$[0-9,]+\.?\d*)/g,
    '<div class="flex justify-between py-2 border-b border-gray-200 bg-blue-50 px-3 rounded"><span class="text-blue-800 font-medium">Deposit Required:</span><span class="font-bold text-blue-800">$1</span></div>',
  )

  // Handle optional add-ons
  html = html.replace(
    /\*\*(.*?)\*\*\s+(.*?)\s+(\+\$[0-9,]+\.?\d*)/g,
    '<div class="flex justify-between items-center py-3 border-b border-gray-200"><div><div class="font-semibold">$1</div><div class="text-sm text-gray-600">$2</div></div><div class="font-semibold text-green-600">$3</div></div>',
  )

  return html
}

function processFinalText(html: string): string {
  // Split by double newlines to form paragraphs, but be careful with existing HTML
  const sections = html.split(/\n\s*\n/)
  const processedSections: string[] = []

  for (const section of sections) {
    const trimmedSection = section.trim()
    if (!trimmedSection) continue

    // If section contains block-level HTML, don't wrap in paragraph
    if (trimmedSection.match(/<(div|table|ul|ol|h[1-6]|hr|blockquote)/i)) {
      // Just convert single newlines to <br> if needed
      processedSections.push(trimmedSection.replace(/\n(?!<)/g, "<br>"))
    } else {
      // Regular text paragraph - wrap in <p> and convert newlines to <br>
      const processed = trimmedSection.replace(/\n/g, "<br>")
      processedSections.push(`<p class="mb-4">${processed}</p>`)
    }
  }

  return processedSections.join("\n")
}
