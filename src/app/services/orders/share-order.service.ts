import { inject, Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as QRCode from 'qrcode';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ShareOrderService {
  private backendUrl = environment.API_URL;

  constructor() {}

  public async generateOrderPdf(orders: any[]) {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
    });

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      if (i > 0) doc.addPage();

      // ✅ Normalize imageProduct — always work as array
      const imagePaths: string[] = Array.isArray(order.imageProduct)
        ? order.imageProduct
        : order.imageProduct
          ? [order.imageProduct]
          : [];

      // --- 1. QR CODE (Only containing Order Number Now) ---
      let qrCodeDataUrl = '';
      try {
        const qrContent = order.orderNumber ? String(order.orderNumber) : 'N/A';
        qrCodeDataUrl = await QRCode.toDataURL(qrContent, {
          margin: 1,
          width: 150,
          color: { dark: '#000000', light: '#ffffff' },
        });
      } catch (err) {
        console.error('QR Generation Error:', err);
      }

      // --- 2. HEADER ---
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('RK Jewellers', 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('Order Receipt', 14, 26);

      // QR Code Placement
      if (qrCodeDataUrl) {
        doc.addImage(qrCodeDataUrl, 'PNG', 14, 33, 24, 24);
        doc.setFontSize(7);
        doc.setTextColor(0);
        doc.text('SCAN TO UPDATE', 15, 59);
      }

      // --- 3. PRODUCT IMAGE (Page 1 — first image) ---
      if (imagePaths.length > 0) {
        try {
          const imageUrl = `${this.backendUrl}/${imagePaths[0]}`;
          const base64Data = await this.getProportionalImageDetails(
            imageUrl,
            94.83,
            120.69,
          );
          doc.addImage(
            base64Data.base64,
            'JPEG',
            100,
            14,
            base64Data.width,
            base64Data.height,
          );
        } catch (e) {
          console.warn('First image load failed:', e);
          doc.setDrawColor(200);
          doc.rect(100, 14, 94.83, 120.69);
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text('Image Not Found', 147, 75, { align: 'center' });
        }
      }

      // --- 4. PRIMARY ORDER INFO ---
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.text(`Order No: ${order.orderNumber || 'N/A'}`, 14, 80);

      doc.setFont('helvetica', 'normal');
      const odDate = order.timestamp
        ? new Date(order.timestamp).toLocaleDateString('en-GB')
        : 'N/A';
      const delDate = order.deliveryDate
        ? new Date(order.deliveryDate).toLocaleDateString('en-GB')
        : 'N/A';

      doc.text(`OD Date: ${odDate}`, 14, 85);
      doc.text(`Delivery Date: ${delDate}`, 14, 90);

      // --- 5. SPECIFICATIONS TABLE ---
      const tableBody = [
        [
          'Order No.:',
          order.orderNumber || 'N/A',
          'Gold Weight:',
          order.goldWeight ? `${order.goldWeight} gm` : 'N/A',
        ],
        ['Order Date:', odDate, 'Purity:', order.purity || 'N/A'],
        ['Delivery Date:', delDate, 'Gold Colour:', order.goldColor || 'N/A'],
        [
          'Sales Person:',
          order.salesperson || 'N/A',
          'Diamond Details:',
          order.diamondDetails || 'N/A',
        ],
        [
          'Item Category:',
          order.itemCategory || 'N/A',
          'Stone Details:',
          order.stoneDetails || 'N/A',
        ],
        ['Karigar:', order.karigari || 'N/A', 'Size:', order.size || 'N/A'],
        [
          'Party Order No:',
          order.partyOrderNo || 'N/A',
          'Product Code:',
          order.productCode || 'N/A',
        ],
      ];

      autoTable(doc, {
        startY: 145,
        theme: 'grid',
        head: [['Specification', 'Details', 'Specification', 'Details']],
        body: tableBody,
        headStyles: { fillColor: [10, 10, 10], textColor: 255, halign: 'left' },
        columnStyles: {
          0: { cellWidth: 35, fontStyle: 'bold', fillColor: [245, 245, 245] },
          1: { cellWidth: 55 },
          2: { cellWidth: 35, fontStyle: 'bold', fillColor: [245, 245, 245] },
          3: { cellWidth: 'auto' },
        },
        styles: { fontSize: 9, cellPadding: 3 },
      });

      // --- 6. REMARKS ---
      const finalY = (doc as any).lastAutoTable.finalY || 160;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('Special Remarks:', 14, finalY + 12);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 0, 0);
      doc.text(order.remarks || 'No special instructions', 14, finalY + 19);

      // --- 7. FOOTER (Page 1) ---
      this.addFooter(doc);

      // --- 8. PAGE 2 — ADDITIONAL IMAGES GRID (2 columns, Proportional Fit) ---
      if (imagePaths.length > 1) {
        doc.addPage();

        // Page 2 Header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 40);
        doc.text('RK Jewellers', 14, 15);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`Order No: ${order.orderNumber} — Product Images`, 14, 22);

        // Divider line
        doc.setDrawColor(200);
        doc.line(14, 25, 196, 25);

        // ── 2-column layout dimensions ───────────────────────────────
        const pageWidth = doc.internal.pageSize.width; // 210mm
        const pageHeight = doc.internal.pageSize.height; // 297mm
        const marginLeft = 14;
        const marginTop = 32;
        const colGap = 6;
        const rowGap = 8;
        const cols = 2;

        // Calculate max image dimensions based on layout and maintain aspect ratio
        const maxImgW = (pageWidth - marginLeft * 2 - colGap) / cols; // ~88mm
        const maxImgH = maxImgW * 1.1; // ~96.8mm Max Height

        const labelH = 6;
        const cellH = maxImgH + labelH + rowGap;
        const imgsPerPage =
          Math.floor((pageHeight - marginTop - 20) / cellH) * cols;

        const remainingImages = imagePaths.slice(1);

        for (let r = 0; r < remainingImages.length; r++) {
          // Start new page if grid is full
          if (r > 0 && r % imgsPerPage === 0) {
            doc.addPage();

            // Continuation header
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(40, 40, 40);
            doc.text('RK Jewellers', 14, 15);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text(
              `Order No: ${order.orderNumber} — Product Images (cont.)`,
              14,
              22,
            );

            doc.setDrawColor(200);
            doc.line(14, 25, 196, 25);
          }

          const col = r % cols;
          const row = Math.floor((r % imgsPerPage) / cols);
          const x = marginLeft + col * (maxImgW + colGap);
          const y = marginTop + row * cellH;

          // Background card placeholder Box
          doc.setDrawColor(230);
          doc.setFillColor(250, 250, 250);
          doc.roundedRect(x, y, maxImgW, maxImgH, 2, 2, 'FD');

          try {
            const imageUrl = `${this.backendUrl}/${remainingImages[r]}`;
            // Proportional image helper returns base64 + dimensions to fit within maxImgW x maxImgH
            const base64Data = await this.getProportionalImageDetails(
              imageUrl,
              maxImgW,
              maxImgH,
            );

            // Center the image within the box
            const centeredX = x + (maxImgW - base64Data.width) / 2;
            const centeredY = y + (maxImgH - base64Data.height) / 2;

            doc.addImage(
              base64Data.base64,
              'JPEG',
              centeredX,
              centeredY,
              base64Data.width,
              base64Data.height,
            );
          } catch (e) {
            console.warn(`Image ${r + 2} failed to load:`, e);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text('Image Not Available', x + maxImgW / 2, y + maxImgH / 2, {
              align: 'center',
            });
          }

          // Image label below image
          doc.setFontSize(7);
          doc.setTextColor(120);
          doc.setFont('helvetica', 'normal');
          doc.text(`Image ${r + 2}`, x + maxImgW / 2, y + maxImgH + 4, {
            align: 'center',
          });
        }

        // Footer on last image page
        this.addFooter(doc);
      }
    }

    // --- SAVE PDF ---
    const fileName =
      orders.length === 1 ? orders[0].orderNumber : 'RK_Jewellers_Orders';
    doc.save(`${fileName}_Receipt.pdf`);
  }

  // ── Reusable footer ────────────────────────────────────────
  private addFooter(doc: jsPDF) {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Manifest generated on: ${new Date().toLocaleString('en-GB')}`,
      14,
      pageHeight - 10,
    );
    doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - 25, pageHeight - 10);
  }

  // ── Proportional Aspect Ratio Helper ───────────────────────
  private getProportionalImageDetails(
    url: string,
    maxWidth: number,
    maxHeight: number,
  ): Promise<{ base64: string; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Aspect Ratio calculation to fit within maxWidth x maxHeight
        const ratio = Math.min(maxWidth / width, maxHeight / height);

        const finalWidth = width * ratio;
        const finalHeight = height * ratio;

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);

        resolve({
          base64: canvas.toDataURL('image/jpeg'),
          width: finalWidth,
          height: finalHeight,
        });
      };
      img.onerror = (error) => reject(error);
      img.src = url;
    });
  }
}
