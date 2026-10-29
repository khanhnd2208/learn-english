import { cache } from 'react';
/** One clock per server render, so cached loaders called from the layout and the page share their result. */
export const requestNow = cache(() => new Date());
