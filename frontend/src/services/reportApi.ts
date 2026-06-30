import axios from 'axios';
import type { ReportSummaryData } from '../types/ReportTypes';
import type { SingleResponse } from '../types/CustomerTypes';

const BASE = '/api/v1/reports';

export async function getReportSummary(): Promise<SingleResponse<ReportSummaryData>> {
  const { data } = await axios.get<SingleResponse<ReportSummaryData>>(`${BASE}/summary`);
  return data;
}
