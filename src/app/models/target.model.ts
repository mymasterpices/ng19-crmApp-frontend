export interface TargetData {
  sales_amount: number;
  gold_weight: number;
  diamond_weight: number;
  stone_weight: number;
}

export interface SalesTarget {
  _id?: string;
  user_id: string;
  month: number;
  year: number;
  targets: TargetData;
  achievements: TargetData;
  status: 'pending' | 'achieved' | 'partially_achieved';
}
