export const downloadInvoicePDF = (invoiceData: any) => {
  if (typeof window === "undefined") {
    console.warn("downloadInvoicePDF only works in the browser.")
    return
  }

  const element = document.getElementById("invoice-content")

  if (!element) {
    console.error("Invoice content element not found.")
    return
  }

  const opt = {
    margin: 10,
    filename: `invoice-${invoiceData.quoteNumber}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  }

  // @ts-ignore
  window.html2pdf().from(element).set(opt).save()
}
