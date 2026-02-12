import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as QRCode from 'qrcode'; // Standard library for generating QR codes
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ShareOrderService {
  private backendUrl = environment.API_URL;

  constructor() {}

  /**
   * Generates a professional Jewelry Job Card PDF with QR Code and Product Image
   * @param orders Array of order objects (e.g., RK0119)
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

      // --- 1. GENERATE QR CODE ---
      // This creates a QR code image representing the Order Number
      let qrCodeDataUrl = '';
      try {
        qrCodeDataUrl = await QRCode.toDataURL(order.orderNumber || 'N/A', {
          margin: 1,
          width: 150,
          color: { dark: '#000000', light: '#ffffff' },
        });
      } catch (err) {
        console.error('QR Generation Error:', err);
      }

      // --- 2. HEADER & BRANDING ---
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('RK Jewellers', 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('Order Receipt', 14, 26);

      // --- 3. PLACE QR CODE (Top Middle) ---
      if (qrCodeDataUrl) {
        doc.addImage(qrCodeDataUrl, 'PNG', 85, 10, 25, 25);
        doc.setFontSize(7);
        doc.text('SCAN TO UPDATE', 87, 38);
      }

      // --- 4. PRODUCT IMAGE (Top Right) ---
      if (order.imageProduct) {
        try {
          const imageUrl = `${this.backendUrl}/${order.imageProduct}`;
          const base64Img = await this.getBase64ImageFromURL(imageUrl);
          doc.addImage(base64Img, 'JPEG', 145, 10, 45, 45);
        } catch (e) {
          doc.setDrawColor(200);
          doc.rect(145, 10, 45, 45);
          doc.setFontSize(8);
          doc.text('Image Not Found', 155, 33);
        }
      }

      // --- 5. PRIMARY ORDER INFO ---
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.text(`Order No: ${order.orderNumber || 'N/A'}`, 14, 42);

      doc.setFont('helvetica', 'normal');
      const odDate = order.timestamp || order.deliveryDate;
      doc.text(
        `OD Date: ${odDate ? new Date(odDate).toLocaleDateString() : 'N/A'}`,
        14,
        48,
      );
      doc.text(
        `Delivery Date: ${order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'N/A'}`,
        14,
        54,
      );

      // --- 6. SPECIFICATIONS TABLE ---
      autoTable(doc, {
        startY: 62,
        theme: 'grid',
        head: [['Specification', 'Details']],
        body: [
          ['Order No. :', order.orderNumber || 'N/A'],
          [
            'Order Date :',
            order.timestamp
              ? new Date(order.timestamp).toLocaleDateString()
              : 'N/A',
          ],
          [
            'Delivery Date :',
            order.deliveryDate
              ? new Date(order.deliveryDate).toLocaleDateString()
              : 'N/A',
          ],
          ['Sales Person :', order.salesperson || 'N/A'],
          [
            'Gold Weight :',
            order.goldWeight ? `${order.goldWeight} gm` : 'N/A',
          ],
          ['Karigar :', order.karigari || 'N/A'], // Mapped from karigari
          ['Party Order No :', order.gatiOrderNo || 'N/A'], // Mapped from gatiOrderNo
          ['Item Category :', order.itemCategory || 'N/A'],
          ['Purity :', order.purity || 'N/A'],
          ['Gold Colour :', order.goldColor || 'N/A'],
          ['Diamond Details :', order.diamondDetails || '0.00'],
          ['Stone Details :', order.stoneDetails || '0.00'],
          ['Product Code :', order.productCode || 'N/A'],
          ['Size :', order.size || 'N/A'],
        ],
        headStyles: {
          fillColor: [40, 40, 40],
          textColor: 255,
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 45, fontStyle: 'bold', fillColor: [245, 245, 245] },
          1: { cellWidth: 'auto' },
        },
        styles: { fontSize: 10, cellPadding: 3.5 },
      });

      // --- 7. REMARKS ---
      const finalY = (doc as any).lastAutoTable.finalY || 180;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Special Remarks:', 14, finalY + 12);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(220, 0, 0); // Highlight in Red
      doc.text(
        order.remarks || 'No special instructions provided.',
        14,
        finalY + 19,
      );

      // --- 8. FOOTER ---
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(
        `Manifest generated on: ${new Date().toLocaleString()}`,
        14,
        pageHeight - 10,
      );
      doc.text(
        `Page ${doc.getNumberOfPages()}`,
        doc.internal.pageSize.width - 25,
        pageHeight - 10,
      );
    }

    const docName =
      orders.length === 1 ? orders[0].orderNumber : 'Jewelry_Report';
    doc.save(`${docName}_Export.pdf`);
  }

  /**
   * Helper: URL to Base64
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
