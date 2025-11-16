import type { Rule } from '../../types';

/**
 * Wait for an element to appear in the DOM
 * @param selector - CSS selector for the element
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 * @returns Promise that resolves with the element or null if timeout
 */
export function waitForElement(selector: string, timeout: number = 10000): Promise<Element | null> {
  return new Promise((resolve) => {
    // Check if element already exists
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    // Set up observer
    const observer = new MutationObserver((_mutations, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Set timeout
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/**
 * Debounce function calls
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

/**
 * Get rules from storage
 * @returns Promise with array of rules
 */
export async function getRulesFromStorage(): Promise<Rule[]> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_RULES' }, (response) => {
      resolve(response || []);
    });
  });
}

/**
 * Listen for storage changes and execute callback
 * @param callback - Function to call when rules change
 */
export function onRulesChanged(callback: (rules: Rule[]) => void): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.rules) {
      callback(changes.rules.newValue || []);
    }
  });
}

/**
 * Log with extension prefix for easier debugging
 * @param message - Message to log
 * @param data - Optional data to log
 */
export function log(message: string, data?: any): void {
  const prefix = '[Redactly]';
  if (data !== undefined) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
}

/**
 * Log error with extension prefix
 * @param message - Error message
 * @param error - Optional error object
 */
export function logError(message: string, error?: any): void {
  const prefix = '[Redactly Error]';
  if (error !== undefined) {
    console.error(prefix, message, error);
  } else {
    console.error(prefix, message);
  }
}

/**
 * Check if the current site is enabled
 * @param site - Site hostname
 * @returns Promise that resolves to true if enabled
 */
export async function isSiteEnabled(site: string): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_SITE_SETTINGS' }, (response) => {
      if (response && response[site]) {
        resolve(response[site].enabled);
      } else {
        resolve(false);
      }
    });
  });
}

/**
 * Update site last used timestamp
 * @param site - Site hostname
 */
export function updateSiteLastUsed(site: string): void {
  chrome.runtime.sendMessage({
    type: 'UPDATE_SITE_LAST_USED',
    payload: { site },
  });
}
