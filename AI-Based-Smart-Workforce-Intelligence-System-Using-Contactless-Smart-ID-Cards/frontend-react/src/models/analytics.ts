export interface KPI {
  label: string;
  value: number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
  color?: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  label?: string;
}

export interface HourlyData {
  hour: string;
  count: number;
  ins: number;
  outs: number;
}

export interface AnalyticsData {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  punctualityRate: number;
  hourlyData: HourlyData[];
  departmentData: ChartDataPoint[];
}
