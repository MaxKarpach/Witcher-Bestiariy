import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { RollRecord } from '../types';
import { generateRollId } from '../utils/rollUtils';

interface RollHistoryContextValue {
  records: RollRecord[];
  addRecord: (record: Omit<RollRecord, 'id'>) => void;
}

const RollHistoryContext = createContext<RollHistoryContextValue | null>(null);

export function RollHistoryProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<RollRecord[]>([]);

  const addRecord = useCallback((record: Omit<RollRecord, 'id'>) => {
    const full: RollRecord = { ...record, id: generateRollId() };
    setRecords((prev) => {
      if (prev.length >= 10){
        return [full, ...prev.slice(0, 9)];
      }
      return[full, ...prev]});
  }, []);

  const value: RollHistoryContextValue = { records, addRecord };

  return (
    <RollHistoryContext.Provider value={value}>
      {children}
    </RollHistoryContext.Provider>
  );
}

export function useRollHistory(): RollHistoryContextValue {
  const ctx = useContext(RollHistoryContext);
  if (!ctx) throw new Error('useRollHistory must be used within RollHistoryProvider');
  return ctx;
}
