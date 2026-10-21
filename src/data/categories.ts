export type CategoryKey =
  | 'accommodation'
  | 'food'
  | 'transit'
  | 'activities'
  | 'extras'

export interface CategoryDef {
  key: CategoryKey
  label: string
  /** The destination cost field this category is derived from. */
  field: 'lodging' | 'food' | 'transit' | 'activities' | 'extras'
  /** Accommodation is charged per night; everything else is charged per day. */
  basis: 'night' | 'day'
  /** Key into the icon map in BreakdownBars. */
  icon: string
  blurb: string
}

export const CATEGORIES: CategoryDef[] = [
  {
    key: 'accommodation',
    label: 'Accommodation',
    field: 'lodging',
    basis: 'night',
    icon: 'bed',
    blurb: 'Hostels, dorms and guesthouses',
  },
  {
    key: 'food',
    label: 'Food & groceries',
    field: 'food',
    basis: 'day',
    icon: 'food',
    blurb: 'Groceries and eating out',
  },
  {
    key: 'transit',
    label: 'Local transport',
    field: 'transit',
    basis: 'day',
    icon: 'bus',
    blurb: 'Buses, metro, trains and rideshares',
  },
  {
    key: 'activities',
    label: 'Activities & nightlife',
    field: 'activities',
    basis: 'day',
    icon: 'ticket',
    blurb: 'Museums, events, coffee and nights out',
  },
  {
    key: 'extras',
    label: 'Shopping & sundries',
    field: 'extras',
    basis: 'day',
    icon: 'bag',
    blurb: 'SIM cards, souvenirs, laundry and snacks',
  },
]

export const CATEGORY_BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]))

export const ALL_CATEGORY_KEYS: CategoryKey[] = CATEGORIES.map((c) => c.key)

export function categoryLabel(key: CategoryKey): string {
  return CATEGORY_BY_KEY.get(key)?.label ?? key
}
