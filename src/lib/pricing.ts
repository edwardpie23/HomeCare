/**
 * Shared industry-standard per-unit pricing rates.
 * Used by both the customer estimate route and the contractor estimate routes
 * so both always return consistent, size-proportional prices.
 */
export const CATEGORY_RATES: Record<string, {
  laborPerUnit: [number, number];
  materialPerUnit: [number, number];
  unit: string;
  pricingNote: string;
}> = {
  painting: {
    laborPerUnit:    [1.50, 3.50],
    materialPerUnit: [0.50, 1.25],
    unit: "sq ft",
    pricingNote: "Adjust for ceiling height, texture, or dark-to-light color changes. Heavy prep/patching adds 20-30%.",
  },
  tile: {
    laborPerUnit:    [6,    14  ],
    materialPerUnit: [2,    8   ],
    unit: "sq ft",
    pricingNote: "Complex patterns or mosaics cost more. Demo of existing tile adds ~10%.",
  },
  flooring: {
    laborPerUnit:    [2,    5   ],
    materialPerUnit: [2,    10  ],
    unit: "sq ft",
    pricingNote: "Hardwood on the higher end; LVP/laminate lower. Subfloor prep adds ~15%.",
  },
  roofing: {
    laborPerUnit:    [3,    6   ],
    materialPerUnit: [2,    5   ],
    unit: "sq ft",
    pricingNote: "Steep pitch adds 20-40%. Tear-off of old shingles adds $1-2/sq ft.",
  },
  concrete: {
    laborPerUnit:    [4,    8   ],
    materialPerUnit: [3,    6   ],
    unit: "sq ft",
    pricingNote: "Decorative/stamped is higher end. Demo adds $2-4/sq ft.",
  },
  fence: {
    laborPerUnit:    [10,   20  ],
    materialPerUnit: [15,   35  ],
    unit: "linear ft",
    pricingNote: "Wood privacy fence is higher; chain link lower. Gates add $150-400 each.",
  },
  drywall: {
    laborPerUnit:    [2,    4   ],
    materialPerUnit: [0.50, 1.50],
    unit: "sq ft",
    pricingNote: "Small patch jobs have a $150-200 minimum call-out. Texture matching adds cost.",
  },
  plumbing: {
    laborPerUnit:    [75,   150 ],
    materialPerUnit: [30,   200 ],
    unit: "hour",
    pricingNote: "Typical job: 1-4 hours. Emergency/weekend rates run 1.5-2x normal.",
  },
  electrical: {
    laborPerUnit:    [75,   130 ],
    materialPerUnit: [20,   150 ],
    unit: "hour",
    pricingNote: "Permit may be required (+$100-300). Panel work is significantly more.",
  },
  hvac: {
    laborPerUnit:    [80,   150 ],
    materialPerUnit: [50,   500 ],
    unit: "hour",
    pricingNote: "Refrigerant handling requires certification. Parts vary widely by unit age.",
  },
  landscaping: {
    laborPerUnit:    [35,   65  ],
    materialPerUnit: [20,   100 ],
    unit: "hour",
    pricingNote: "Crew of 2-3 typical. Equipment rental adds $200-600/day.",
  },
  handyman: {
    laborPerUnit:    [60,   100 ],
    materialPerUnit: [10,   50  ],
    unit: "hour",
    pricingNote: "Minimum 1-2 hour charge. Materials billed at cost + 10-20% markup.",
  },
};

/**
 * Build the size-based math block that goes into any AI prompt.
 * Returns a string with pre-computed min/max numbers so Claude
 * cannot ignore the job size and fall back to a generic flat range.
 */
export function buildSizeMathPrompt(
  categoryId: string,
  size: number | null | undefined,
  city?: string,
  state?: string
): string {
  const rates = CATEGORY_RATES[categoryId];
  if (!rates) return "";

  const hasSize = !!size && size > 0;

  if (!hasSize) {
    return `
Rate reference for this category: $${rates.laborPerUnit[0]}–$${rates.laborPerUnit[1]}/${rates.unit} labor, $${rates.materialPerUnit[0]}–$${rates.materialPerUnit[1]}/${rates.unit} materials.
Estimate scope from description and photos. Note: ${rates.pricingNote}`;
  }

  const [laborMin, laborMax] = rates.laborPerUnit;
  const [matMin, matMax]     = rates.materialPerUnit;

  if (rates.unit === "sq ft" || rates.unit === "linear ft") {
    const calcLaborMin = Math.round(size * laborMin);
    const calcLaborMax = Math.round(size * laborMax);
    const calcMatMin   = Math.round(size * matMin);
    const calcMatMax   = Math.round(size * matMax);
    const rawMin       = calcLaborMin + calcMatMin;
    const rawMax       = calcLaborMax + calcMatMax;

    return `
REQUIRED SIZE-BASED CALCULATION — your final prices must derive from this math:
  Job size:  ${size} ${rates.unit}
  Labor:     ${size} × $${laborMin}–$${laborMax}/${rates.unit} = $${calcLaborMin}–$${calcLaborMax}
  Materials: ${size} × $${matMin}–$${matMax}/${rates.unit} = $${calcMatMin}–$${calcMatMax}
  Raw total before complexity adjustments: $${rawMin}–$${rawMax}
  Industry note: ${rates.pricingNote}

Adjust this base total for complexity, photos, prep needed, and ${city ? `${city}, ${state}` : "local"} market.
Your minPrice/maxPrice MUST be proportional to ${size} ${rates.unit}. Do NOT return a generic flat number.`;
  }

  // Hourly categories
  return `
HOURLY RATE GUIDE:
  Labor: $${laborMin}–$${laborMax}/hour · Materials: ~$${matMin}–$${matMax}/hour equivalent
  Estimate hours needed from description and photos, then multiply.
  Industry note: ${rates.pricingNote}`;
}
