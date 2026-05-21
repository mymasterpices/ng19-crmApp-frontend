export interface DailyStat {
  date: Date | string;
  footfall: number;
  conversion: number;
  pc: string[];
}

export interface MonthlyReport {
  _id?: string;
  year: number;
  month: number;
  month_name: string;
  user_id: string;
  sales_person: string;
  daily_stats: DailyStat[];
}
