/** Shared layout primitives for consistent staff cards across viewport sizes. */
export const adminPage = 'mx-auto w-full max-w-[1600px] space-y-5 sm:space-y-6';

export const adminCard = 'min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900';

export const adminStatGrid = 'grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4';

export const adminStatCard = `${adminCard} flex h-full min-h-28 flex-col justify-between p-4 sm:min-h-32 sm:p-5`;

export const adminEmptyCard = `${adminCard} flex min-h-56 flex-col items-center justify-center px-4 py-10 text-center sm:px-8`;
