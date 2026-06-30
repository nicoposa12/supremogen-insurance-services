/**
 * Report module TypeScript interfaces.
 */

export interface PremiumByProduct {
  category: string;
  total_premium: number;
}

export interface LossRatioByProduct {
  category: string;
  premium: number;
  claims: number;
  loss_ratio: number;
}

export interface QuotationPipeline {
  status: string;
  count: number;
}

export interface CollectionSummary {
  total_invoiced: number;
  total_collected: number;
  outstanding: number;
  collection_rate: number;
}

export interface InvoiceAging {
  paid: number;
  current: number;
  overdue: number;
}

export interface MonthlyBillingCollection {
  month: string;
  billings: number;
  collections: number;
}

export interface ReportSummaryData {
  premium_by_product: PremiumByProduct[];
  loss_ratio_by_product: LossRatioByProduct[];
  quotation_pipeline: QuotationPipeline[];
  collection_summary: CollectionSummary;
  invoice_aging: InvoiceAging;
  monthly_billings_collections: MonthlyBillingCollection[];
}
