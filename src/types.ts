export type ClothingCategory = 'Top' | 'Bottom' | 'Shoes';

export interface WardrobeItem {
  id: string;
  label: string;
  category: ClothingCategory;
  dominantColors: string[]; // hex values, e.g., ['#FF5733', '#33FF57']
  imageUrl?: string; // Data URL or object URL for local preview
  source: 'upload' | 'preset' | 'manual';
  price?: number;
}

export interface MannequinScale {
  height: number; // Y-scale modifier, e.g., 0.8 to 1.5
  shoulderWidth: number; // X-scale modifier for upper torso/shoulders
  waistBuild: number; // Z-scale or joint X-Z scale modifier for waist
}

export interface CalendarEntry {
  dateString: string; // YYYY-MM-DD
  outfit: {
    mannequinScale: MannequinScale;
    topId?: string;
    bottomId?: string;
    shoesId?: string;
    colors: string[]; // Applied colors
  };
}
