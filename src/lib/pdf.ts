// Lightweight PDF generator wrapper (optional).
// Tries to load puppeteer/puppeteer-core at runtime. If unavailable, returns null.

export async function generatePDFBufferFromHTML(html: string): Promise<Buffer | null> {
  try {
    // Lazy require to avoid bundling errors
    const req: any = (Function('try{return require}catch(e){return null}')() as any);
    if (!req) return null;
    const puppeteer = req('puppeteer') || req('puppeteer-core');
    if (!puppeteer) return null;

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf: Buffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '16mm', right: '12mm', bottom: '16mm', left: '12mm' } });
      await page.close();
      return pdf;
    } finally {
      await browser.close().catch(()=>{});
    }
  } catch {
    return null;
  }
}

