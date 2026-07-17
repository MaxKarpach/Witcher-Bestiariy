import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { ModalStep, RollSide, ParamGroupKey } from '../types';

interface ParameterRollState {
  type: 'parameterRoll';
  step: ModalStep;
  creatureId: string;
  paramName: string;
  paramValue: number;
  side: RollSide | null;
}

interface ValueInputState {
  type: 'valueInput';
  creatureId: string;
  paramName: string;
  paramGroup: ParamGroupKey;
  currentValue: number;
}

type ModalState = ParameterRollState | ValueInputState | { type: null };

interface ModalContextValue {
  modalState: ModalState;
  openParameterRoll: (paramName: string, paramValue: number, creatureId: string) => void;
  openValueInput: (
    creatureId: string,
    paramName: string,
    paramGroup: ParamGroupKey,
    currentValue: number
  ) => void;
  setRollSide: (side: RollSide) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<ModalState>({ type: null });

  const openParameterRoll = useCallback((paramName: string, paramValue: number, creatureId: string) => {
    setModalState({
      type: 'parameterRoll',
      step: 'side',
      creatureId,
      paramName,
      paramValue,
      side: null,
    });
  }, []);

  const openValueInput = useCallback(
    (
      creatureId: string,
      paramName: string,
      paramGroup: ParamGroupKey,
      currentValue: number
    ) => {
      setModalState({
        type: 'valueInput',
        creatureId,
        paramName,
        paramGroup,
        currentValue,
      });
    },
    []
  );

  const setRollSide = useCallback((side: RollSide) => {
    setModalState((prev) => {
      if (prev.type !== 'parameterRoll') return prev;
      return { ...prev, step: 'values', side };
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({ type: null });
  }, []);

  const value: ModalContextValue = {
    modalState,
    openParameterRoll,
    openValueInput,
    setRollSide,
    closeModal,
  };

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
}

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
}
