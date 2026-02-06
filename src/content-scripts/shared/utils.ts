import type { Rule } from '../../types';

/**
 * Manages event listeners with automatic cleanup using AbortController.
 * Prevents memory leaks from accumulated listeners during SPA navigation.
 */
export class ListenerManager {
  private controller: AbortController;

  constructor() {
    this.controller = new AbortController();
  }

  /**
   * Get the AbortSignal to pass to addEventListener options
   */
  get signal(): AbortSignal {
    return this.controller.signal;
  }

  /**
   * Abort all listeners managed by this instance and create a new controller
   */
  cleanup(): void {
    this.controller.abort();
    this.controller = new AbortController();
  }

  /**
   * Add an event listener that will be automatically cleaned up
   */
  addEventListener<K extends keyof HTMLElementEventMap>(
    target: HTMLElement | Document,
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void,
    options?: boolean | Omit<AddEventListenerOptions, 'signal'>
  ): void {
    const opts = typeof options === 'boolean'
      ? { capture: options, signal: this.signal }
      : { ...options, signal: this.signal };

    target.addEventListener(type, listener as EventListener, opts);
  }
}

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
 * @returns Debounced function with a cancel method
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = function (...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      timeout = null;
      func(...args);
    }, wait);
  };

  debounced.cancel = function () {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}

/**
 * Get rules from storage
 * @returns Promise with array of rules
 */
export async function getRulesFromStorage(): Promise<Rule[]> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      logError('getRulesFromStorage: Message timeout');
      resolve([]);
    }, 5000);

    try {
      chrome.runtime.sendMessage({ type: 'GET_RULES' }, (response) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) {
          logError('getRulesFromStorage: Runtime error', chrome.runtime.lastError.message);
          resolve([]);
          return;
        }
        resolve(response || []);
      });
    } catch (error) {
      clearTimeout(timeout);
      logError('getRulesFromStorage: Exception', error);
      resolve([]);
    }
  });
}

/**
 * Listen for storage changes and execute callback
 * @param callback - Function to call when rules change
 * @returns Cleanup function to remove the listener
 */
export function onRulesChanged(callback: (rules: Rule[]) => void): () => void {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
    if (areaName === 'local' && changes.rules) {
      callback(changes.rules.newValue || []);
    }
  };

  chrome.storage.onChanged.addListener(listener);

  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}

/**
 * Log with extension prefix for easier debugging
 * @param message - Message to log
 * @param data - Optional data to log
 */
export function log(message: string, data?: unknown): void {
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
export function logError(message: string, error?: unknown): void {
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
    const timeout = setTimeout(() => {
      logError('isSiteEnabled: Message timeout');
      resolve(false);
    }, 5000);

    try {
      chrome.runtime.sendMessage({ type: 'GET_SITE_SETTINGS' }, (response) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) {
          logError('isSiteEnabled: Runtime error', chrome.runtime.lastError.message);
          resolve(false);
          return;
        }
        if (response && response[site]) {
          resolve(response[site].enabled);
        } else {
          resolve(false);
        }
      });
    } catch (error) {
      clearTimeout(timeout);
      logError('isSiteEnabled: Exception', error);
      resolve(false);
    }
  });
}

/**
 * Update site last used timestamp
 * @param site - Site hostname
 */
export function updateSiteLastUsed(site: string): void {
  try {
    chrome.runtime.sendMessage(
      {
        type: 'UPDATE_SITE_LAST_USED',
        payload: { site },
      },
      () => {
        // Check for errors but don't block - this is fire-and-forget
        if (chrome.runtime.lastError) {
          logError('updateSiteLastUsed: Runtime error', chrome.runtime.lastError.message);
        }
      }
    );
  } catch (error) {
    logError('updateSiteLastUsed: Exception', error);
  }
}
