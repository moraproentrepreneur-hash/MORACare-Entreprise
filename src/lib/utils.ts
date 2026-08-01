import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'KMF'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount).replace('KMF', 'FC');
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

// Client-side PDF Generation Utility
export async function downloadMedicalPDF(title: string, subtitle: string, refCode: string, contentLines: string[]) {
  if (typeof window === 'undefined') return;

  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    // Header Branding MORACare
    doc.setFillColor(0, 51, 102); // #003366 MORACare Blue
    doc.rect(0, 0, 210, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('MORACare', 14, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Solution Médicale Internationale - MORA Shawiri', 14, 25);
    doc.text(`Réf: ${refCode}`, 150, 18);
    doc.text(`Date: ${formatDate(new Date().toISOString())}`, 150, 25);

    // Title
    doc.setTextColor(10, 25, 47);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 45);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.text(subtitle, 14, 52);

    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 168, 89); // MORACare Green divider
    doc.line(14, 56, 196, 56);

    // Body lines
    let yPosition = 68;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    contentLines.forEach((line) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 14, yPosition);
      yPosition += 8;
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(128, 128, 128);
      doc.text('MORACare SaaS - Propulsé par MORA Shawiri | www.services.morashawiri.com | +269 430 63 06', 14, 288);
      doc.text(`Page ${i} / ${pageCount}`, 180, 288);
    }

    doc.save(`${refCode}_${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
  } catch (error) {
    console.error('PDF Generation Failed:', error);
  }
}
