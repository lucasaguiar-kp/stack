import * as React from "react";

type PrivateShellLayoutState = {
  title?: string;
};

type PrivateShellLayoutContextValue = {
  state: PrivateShellLayoutState;
  setState: React.Dispatch<React.SetStateAction<PrivateShellLayoutState>>;
};

const PrivateShellLayoutContext = React.createContext<PrivateShellLayoutContextValue | null>(null);

export function PrivateShellLayoutProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<PrivateShellLayoutState>({});

  const value = React.useMemo(() => ({ state, setState }), [state]);

  return (
    <PrivateShellLayoutContext.Provider value={value}>
      {children}
    </PrivateShellLayoutContext.Provider>
  );
}

export function useOptionalPrivateShellLayout() {
  return React.useContext(PrivateShellLayoutContext);
}
