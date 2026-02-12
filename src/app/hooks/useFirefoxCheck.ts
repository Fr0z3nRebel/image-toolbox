"use client";

import { useState, useEffect } from "react";
import { isFirefox } from "../components/utils/browserUtils";

export function useFirefoxCheck(): boolean {
  const [isFirefoxBrowser, setIsFirefoxBrowser] = useState(false);
  useEffect(() => {
    setIsFirefoxBrowser(isFirefox());
  }, []);
  return isFirefoxBrowser;
}
