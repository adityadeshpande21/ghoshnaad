// @ts-check
// Typed ways to reach the element an event came from or a page element, for the screens that write plain DOM code.
// (An event listener's `e.target` is only an EventTarget to the type checker, a query only an Element; on this page they are elements of the markup.)

/** The element an event came from.
 *  @param {Event} e @returns {HTMLElement} */
export const target = e => /** @type {HTMLElement} */ (e.target);

/** The nearest element at or above the one an event came from that matches `selector`, or null.
 *  @param {Event} e @param {string} selector @returns {HTMLElement | null} */
export const clicked = (e, selector) => /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest(selector));

/** An element of the page by selector (null when absent: callers that do not expect that use the app's `env.$`).
 *  @param {string} selector @returns {HTMLElement} */
export const qs = selector => /** @type {HTMLElement} */ (document.querySelector(selector));

/** The elements of the page that match `selector`.
 *  @param {string} selector @returns {HTMLElement[]} */
export const qsa = selector => /** @type {HTMLElement[]} */ ([...document.querySelectorAll(selector)]);
