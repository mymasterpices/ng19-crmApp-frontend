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

  /**
   * Generates a Jewelry Job Card PDF matching the RK Jewellers sample layout
   */
  public async generateOrderPdf(orders: any[]) {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
    });

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      if (i > 0) doc.addPage();

      // --- 1. QR CODE GENERATION ---
      let qrCodeDataUrl = '';
      try {
        // Generates QR based on Order Number [cite: 2, 3]
        const orderIDwithURL = `${this.backendUrl}/api/orders/get?orderNumber=${order.orderNumber}`;

        qrCodeDataUrl = await QRCode.toDataURL(orderIDwithURL || 'N/A', {
          margin: 1,
          width: 150,
          color: { dark: '#000000', light: '#ffffff' },
        });
      } catch (err) {
        console.error('QR Generation Error:', err);
      }

      // --- 2. HEADER SECTION ---
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('RK Jewellers', 14, 20); // Brand Name [cite: 1]

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('Order Receipt', 14, 26); // Subtitle [cite: 1]

      // QR Code Placement (Center-Top)
      if (qrCodeDataUrl) {
        doc.addImage(qrCodeDataUrl, 'PNG', 14, 33, 24, 24);
        doc.setFontSize(7);
        doc.setTextColor(0);
        doc.text('SCAN TO UPDATE', 15, 59); // Instruction [cite: 2]
      }

      // --- 3. PRODUCT IMAGE (Top Right) ---
      if (order.imageProduct) {
        try {
          const imageUrl = `${this.backendUrl}/${order.imageProduct}`;
          const base64Img = await this.getBase64ImageFromURL(imageUrl);
          doc.addImage(base64Img, 'JPEG', 100, 14, 94.83, 120.69); // Image placeholder [cite: 6]
        } catch (e) {
          doc.setDrawColor(200);
          doc.rect(100, 14, 100, 40);
          doc.setFontSize(8);
          doc.text('Image Not Found', 158, 35);
        }
      }

      // --- 4. PRIMARY ORDER INFO ---
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.text(`Order No: ${order.orderNumber || 'N/A'}`, 14, 80); // [cite: 3]

      doc.setFont('helvetica', 'normal');
      // Format dates to DD/MM/YYYY as per sample [cite: 4, 5]
      const odDate = order.timestamp
        ? new Date(order.timestamp).toLocaleDateString('en-GB')
        : 'N/A';
      const delDate = order.deliveryDate
        ? new Date(order.deliveryDate).toLocaleDateString('en-GB')
        : 'N/A';

      doc.text(`OD Date: ${odDate}`, 14, 85); // [cite: 4]
      doc.text(`Delivery Date: ${delDate}`, 14, 90); // [cite: 5]

      // --- 5. SPECIFICATIONS TABLE (2-Column Grid / 4-Column Layout) ---
      // This maps data into the left and right detail columns
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
        head: [['Specification', 'Details', 'Specification', 'Details']], //
        body: tableBody,
        headStyles: {
          fillColor: [10, 10, 10],
          textColor: 255,
          halign: 'left',
        },
        columnStyles: {
          0: { cellWidth: 35, fontStyle: 'bold', fillColor: [245, 245, 245] },
          1: { cellWidth: 55 },
          2: { cellWidth: 35, fontStyle: 'bold', fillColor: [245, 245, 245] },
          3: { cellWidth: 'auto' },
        },
        styles: { fontSize: 9, cellPadding: 3 },
      });

      // --- 6. REMARKS SECTION ---
      const finalY = (doc as any).lastAutoTable.finalY || 160;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Special Remarks:', 14, finalY + 12); //

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 0, 0); // Red highlight for remarks
      doc.text(
        order.remarks || 'No special instructions', //
        14,
        finalY + 19,
      );

      // --- 7. FOOTER ---
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Manifest generated on: ${new Date().toLocaleString('en-GB')}`, // [cite: 8]
        14,
        pageHeight - 10,
      );
      doc.text(
        `Page ${doc.getNumberOfPages()}`, // [cite: 9]
        doc.internal.pageSize.width - 25,
        pageHeight - 10,
      );
    }

    // Save PDF
    const fileName =
      orders.length === 1 ? orders[0].orderNumber : 'RK_Jewellers_Orders';
    doc.save(`${fileName}_Receipt.pdf`);
  }

  /**
   * Helper: Converts Image URL to Base64 for jsPDF
   */
  private getBase64ImageFromURL(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      };
      img.onerror = (error) => reject(error);
      img.src = url;
    });
  }
}
