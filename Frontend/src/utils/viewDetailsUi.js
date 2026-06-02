/**
 * Shared layout tokens for patient record view / read-only summary screens.
 */

/** Use on Card `variant="solid"` or as className override for legacy Card usage. */
export const VIEW_DETAILS_CARD_CLASS =
  '!bg-white !border !border-gray-200 !shadow-sm !rounded-xl !backdrop-blur-none hover:!bg-white hover:!shadow-sm';

export const VIEW_PAGE_SHELL_CLASS = 'min-h-screen bg-gray-50 space-y-6';

export const VIEW_SECTION_ICON = {
  patient: 'rounded-lg bg-slate-100 p-3 ring-1 ring-slate-200',
  clinical: 'rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-100',
  intake: 'rounded-lg bg-violet-50 p-3 ring-1 ring-violet-100',
  prescription: 'rounded-lg bg-amber-50 p-3 ring-1 ring-amber-100',
  history: 'rounded-lg bg-slate-100 p-3 ring-1 ring-slate-200',
};

export const VIEW_SUBSECTION_TITLE_CLASS =
  'text-sm font-semibold uppercase tracking-wide text-gray-800';

/** Neutral panel for nested read-only blocks (replaces blue left-border panels). */
export const VIEW_NESTED_PANEL_CLASS =
  'rounded-lg border border-gray-200 bg-gray-50 p-4';
