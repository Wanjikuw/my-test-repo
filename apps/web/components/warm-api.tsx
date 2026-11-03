'use client';

import { useEffect } from 'react';
import { wakeApi } from '../lib/api';

/** Renders nothing. Mounted once in the layout, so a first visit starts the API waking. */
export function WarmApi() {
  useEffect(() => {
    wakeApi();
  }, []);

  return null;
}
