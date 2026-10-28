export function p(v) { return parseFloat(String(v || 0).replace(',', '.')) || 0; }

export function formatMoney(v) { 
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0); 
}

export const isInvoicePayment = (t) => t && ((t.description || "").toLowerCase().includes("fatura") || (t.category || "").toLowerCase().includes("fatura"));

export const getTxMonth = (t) => t ? (t.clearanceDate || t.date || '').slice(0, 7) : '';

export const getTransactionDates = (t) => t ? { 
    clearanceDate: t.clearanceDate || t.date || '', 
    // Usa o Vencimento para compras NOVAS, mas respeita o histórico antigo para não misturar:
    billingMonth: t.billingMonth || (t.clearanceDate ? t.clearanceDate.slice(0, 7) : (t.date ? t.date.slice(0, 7) : '')) 
} : { clearanceDate: '', billingMonth: '' };

export const safeDateDisplay = (dateStr) => dateStr ? dateStr.split('-').reverse().join('/') : "--/--/----";