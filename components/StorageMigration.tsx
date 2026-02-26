'use client';

import { useEffect } from 'react';
import { runStorageMigration } from '@/lib/storage-migration';

export default function StorageMigration() {
  useEffect(() => {
    runStorageMigration();
  }, []);

  return null;
}
