"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface NavigationLoadingContextValue {
  isNavigating: boolean;
  setIsNavigating: (value: boolean) => void;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextValue>({
  isNavigating: false,
  setIsNavigating: () => {},
});

export const useNavigationLoading = () => useContext(NavigationLoadingContext);

export const NavigationLoadingProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();

  // Clear loading state once the new page has rendered
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  return (
    <NavigationLoadingContext.Provider value={{ isNavigating, setIsNavigating }}>
      {children}
    </NavigationLoadingContext.Provider>
  );
};
