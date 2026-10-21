export interface Country {
  iso: string; // unique key (the dial code alone isn't unique, e.g. +1)
  name: string;
  dial: string; // e.g. '+91'
  maxLength: number; // max digits of the national number
}

export const DEFAULT_COUNTRY_ISO = 'IN';

// Extend as needed, or generate the full list from libphonenumber-js
export const COUNTRIES: Country[] = [
  { iso: 'IN', name: 'India', dial: '+91', maxLength: 10 },
  { iso: 'US', name: 'United States', dial: '+1', maxLength: 10 },
  { iso: 'CA', name: 'Canada', dial: '+1', maxLength: 10 },
  { iso: 'GB', name: 'United Kingdom', dial: '+44', maxLength: 10 },
  { iso: 'AE', name: 'United Arab Emirates', dial: '+971', maxLength: 9 },
  { iso: 'SA', name: 'Saudi Arabia', dial: '+966', maxLength: 9 },
  { iso: 'QA', name: 'Qatar', dial: '+974', maxLength: 8 },
  { iso: 'KW', name: 'Kuwait', dial: '+965', maxLength: 8 },
  { iso: 'OM', name: 'Oman', dial: '+968', maxLength: 8 },
  { iso: 'BH', name: 'Bahrain', dial: '+973', maxLength: 8 },
  { iso: 'SG', name: 'Singapore', dial: '+65', maxLength: 8 },
  { iso: 'MY', name: 'Malaysia', dial: '+60', maxLength: 10 },
  { iso: 'AU', name: 'Australia', dial: '+61', maxLength: 9 },
  { iso: 'NZ', name: 'New Zealand', dial: '+64', maxLength: 10 },
  { iso: 'NP', name: 'Nepal', dial: '+977', maxLength: 10 },
  { iso: 'BD', name: 'Bangladesh', dial: '+880', maxLength: 10 },
  { iso: 'LK', name: 'Sri Lanka', dial: '+94', maxLength: 9 },
  { iso: 'DE', name: 'Germany', dial: '+49', maxLength: 11 },
  { iso: 'FR', name: 'France', dial: '+33', maxLength: 9 },
];
