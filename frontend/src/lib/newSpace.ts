import { createContext, useContext } from "react";

export const NewSpaceContext = createContext<{ openNewSpace: () => void }>({
  openNewSpace: () => {},
});

export const useNewSpace = () => useContext(NewSpaceContext);
