import {
  Utensils, UtensilsCrossed, Coffee, Beer,
  Car, Bike, Plane, Bus,
  Zap, Wifi, Smartphone, Tv,
  ShoppingBasket, ShoppingBag, Shirt, Gift,
  Stethoscope, HeartPulse, Dumbbell, PawPrint,
  Film, Music, Book, Gamepad2,
  GraduationCap, Briefcase, Hammer, Home,
  Repeat, PiggyBank, CreditCard, Banknote,
  Scissors, Circle,
  type LucideIcon,
} from 'lucide-react'

// Exact Ionicons name strings offered by the mobile app's category picker
// (smiley-mobile/mobile/app/expense-categories.tsx PRESET_ICONS). The web
// picker MUST offer these same string values — categories are stored in a
// table shared with mobile, and mobile renders `icon` via @expo/vector-icons
// Ionicons directly, so any value not in this exact list won't render there.
export const PRESET_ICONS = [
  'fast-food-outline', 'restaurant-outline', 'cafe-outline', 'beer-outline',
  'car-outline', 'bicycle-outline', 'airplane-outline', 'bus-outline',
  'flash-outline', 'wifi-outline', 'phone-portrait-outline', 'tv-outline',
  'basket-outline', 'bag-handle-outline', 'shirt-outline', 'gift-outline',
  'medkit-outline', 'fitness-outline', 'barbell-outline', 'paw-outline',
  'film-outline', 'musical-notes-outline', 'book-outline', 'game-controller-outline',
  'school-outline', 'business-outline', 'hammer-outline', 'home-outline',
  'repeat-outline', 'save-outline', 'card-outline', 'cash-outline',
  'cut-outline', 'ellipsis-horizontal-circle-outline',
]

// Exact hex values from the mobile app's category picker (same file, PRESET_COLORS)
export const PRESET_COLORS = [
  '#E67E22', '#F39C12', '#E74C3C', '#E91E63', '#9B59B6',
  '#3498DB', '#00BCD4', '#1ABC9C', '#27AE60', '#2ECC71',
  '#8BC34A', '#FF5722', '#607D8B', '#795548', '#5C6BC0',
  '#95A5A6',
]

const ICON_MAP: Record<string, LucideIcon> = {
  'fast-food-outline': Utensils,
  'restaurant-outline': UtensilsCrossed,
  'cafe-outline': Coffee,
  'beer-outline': Beer,
  'car-outline': Car,
  'bicycle-outline': Bike,
  'airplane-outline': Plane,
  'bus-outline': Bus,
  'flash-outline': Zap,
  'wifi-outline': Wifi,
  'phone-portrait-outline': Smartphone,
  'tv-outline': Tv,
  'basket-outline': ShoppingBasket,
  'bag-handle-outline': ShoppingBag,
  'shirt-outline': Shirt,
  'gift-outline': Gift,
  'medkit-outline': Stethoscope,
  'fitness-outline': HeartPulse,
  'barbell-outline': Dumbbell,
  'paw-outline': PawPrint,
  'film-outline': Film,
  'musical-notes-outline': Music,
  'book-outline': Book,
  'game-controller-outline': Gamepad2,
  'school-outline': GraduationCap,
  'business-outline': Briefcase,
  'hammer-outline': Hammer,
  'home-outline': Home,
  'repeat-outline': Repeat,
  'save-outline': PiggyBank,
  'card-outline': CreditCard,
  'cash-outline': Banknote,
  'cut-outline': Scissors,
  'ellipsis-horizontal-circle-outline': Circle,
}

export function getCategoryIcon(icon: string): LucideIcon {
  return ICON_MAP[icon] ?? Circle
}
