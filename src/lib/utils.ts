import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export const JOB_CATEGORIES = [
  {
    id: "drywall",
    name: "Drywall Repair",
    icon: "🧱",
    description: "Holes, cracks, water damage",
    baseMinPrice: 150,
    baseMaxPrice: 800,
    unit: "job",
  },
  {
    id: "painting",
    name: "Interior Painting",
    icon: "🎨",
    description: "Rooms, walls, ceilings",
    baseMinPrice: 200,
    baseMaxPrice: 1500,
    unit: "sq ft",
  },
  {
    id: "tile",
    name: "Tile Work",
    icon: "🔲",
    description: "Install, replace, grout",
    baseMinPrice: 300,
    baseMaxPrice: 2000,
    unit: "sq ft",
  },
  {
    id: "plumbing",
    name: "Plumbing",
    icon: "🔧",
    description: "Faucets, pipes, leaks",
    baseMinPrice: 150,
    baseMaxPrice: 1200,
    unit: "job",
  },
  {
    id: "electrical",
    name: "Electrical",
    icon: "⚡",
    description: "Outlets, fixtures, fans",
    baseMinPrice: 100,
    baseMaxPrice: 800,
    unit: "job",
  },
  {
    id: "flooring",
    name: "Flooring",
    icon: "🏠",
    description: "Hardwood, laminate, vinyl",
    baseMinPrice: 500,
    baseMaxPrice: 5000,
    unit: "sq ft",
  },
  {
    id: "roofing",
    name: "Roof Repair",
    icon: "🏗️",
    description: "Leaks, shingles, gutters",
    baseMinPrice: 300,
    baseMaxPrice: 3000,
    unit: "sq ft",
  },
  {
    id: "landscaping",
    name: "Landscaping",
    icon: "🌿",
    description: "Lawn, garden, cleanup",
    baseMinPrice: 100,
    baseMaxPrice: 2000,
    unit: "job",
  },
  {
    id: "hvac",
    name: "HVAC",
    icon: "❄️",
    description: "AC, heating, vents",
    baseMinPrice: 200,
    baseMaxPrice: 3000,
    unit: "job",
  },
  {
    id: "handyman",
    name: "General Handyman",
    icon: "🔨",
    description: "Misc repairs & installs",
    baseMinPrice: 75,
    baseMaxPrice: 500,
    unit: "hour",
  },
  {
    id: "concrete",
    name: "Concrete & Masonry",
    icon: "🪨",
    description: "Driveway, patio, walkway",
    baseMinPrice: 500,
    baseMaxPrice: 5000,
    unit: "sq ft",
  },
  {
    id: "fence",
    name: "Fencing",
    icon: "🚧",
    description: "Wood, vinyl, chain link",
    baseMinPrice: 800,
    baseMaxPrice: 6000,
    unit: "linear ft",
  },
];
