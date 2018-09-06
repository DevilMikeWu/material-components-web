/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import {MDCFoundation} from '@material/base/index';
import MDCDialogAdapter from './adapter';
import {cssClasses, numbers, strings} from './constants';

class MDCDialogFoundation extends MDCFoundation {
  static get cssClasses() {
    return cssClasses;
  }

  static get strings() {
    return strings;
  }

  static get numbers() {
    return numbers;
  }

  static get defaultAdapter() {
    return /** @type {!MDCDialogAdapter} */ ({
      addClass: (/* className: string */) => {},
      removeClass: (/* className: string */) => {},
      addBodyClass: (/* className: string */) => {},
      removeBodyClass: (/* className: string */) => {},
      eventTargetHasClass: (/* target: !EventTarget, className: string */) => {},
      registerInteractionHandler: (/* eventName: string, handler: !EventListener */) => {},
      deregisterInteractionHandler: (/* eventName: string, handler: !EventListener */) => {},
      registerDocumentHandler: (/* eventName: string, handler: !EventListener */) => {},
      deregisterDocumentHandler: (/* eventName: string, handler: !EventListener */) => {},
      registerWindowHandler: (/* eventName: string, handler: !EventListener */) => {},
      deregisterWindowHandler: (/* eventName: string, handler: !EventListener */) => {},
      computeBoundingRect: () => {},
      trapFocus: () => {},
      releaseFocus: () => {},
      isContentScrollable: () => {},
      areButtonsStacked: () => {},
      getActionFromEvent: (/* event: !Event */) => {},
      notifyOpening: () => {},
      notifyOpened: () => {},
      notifyClosing: (/* action: ?string */) => {},
      notifyClosed: (/* action: ?string */) => {},
    });
  }

  /**
   * @param {!MDCDialogAdapter=} adapter
   */
  constructor(adapter) {
    super(Object.assign(MDCDialogFoundation.defaultAdapter, adapter));

    /**
     * @type {boolean}
     * @private
     */
    this.isOpen_ = false;

    /**
     * @type {number}
     * @private
     */
    this.animationTimer_ = 0;

    this.dialogClickHandler_ = (evt) => this.handleDialogClick_(evt);
    this.windowResizeHandler_ = () => this.handleWindowResize_();
    this.documentKeyDownHandler_ = (evt) => this.handleDocumentKeyDown_(evt);
  };

  destroy() {
    // Ensure that dialog is cleaned up when destroyed
    if (this.isOpen_) {
      this.close(strings.DESTROY_ACTION);
    }
    // Final cleanup of animating class in case the timer has not completed.
    this.handleAnimationTimerEnd_();
    clearTimeout(this.animationTimer_);
  }

  open() {
    this.isOpen_ = true;
    this.adapter_.registerInteractionHandler('click', this.dialogClickHandler_);
    this.adapter_.registerDocumentHandler('keydown', this.documentKeyDownHandler_);
    this.adapter_.registerWindowHandler('resize', this.windowResizeHandler_);
    this.adapter_.registerWindowHandler('orientationchange', this.windowResizeHandler_);
    this.adapter_.addClass(cssClasses.OPENING);

    // Force redraw now that display is no longer "none", to establish basis for animation
    this.adapter_.computeBoundingRect();
    this.adapter_.addClass(cssClasses.OPEN);
    this.adapter_.addBodyClass(cssClasses.SCROLL_LOCK);
    this.adapter_.notifyOpening();

    this.layout();

    clearTimeout(this.animationTimer_);
    this.animationTimer_ = setTimeout(() => {
      this.handleAnimationTimerEnd_();
      this.adapter_.trapFocus();
      this.adapter_.notifyOpened();
    }, numbers.DIALOG_ANIMATION_OPEN_TIME_MS);
  }

  /**
   * @param {string|undefined=} action
   */
  close(action = undefined) {
    this.isOpen_ = false;
    this.adapter_.deregisterInteractionHandler('click', this.dialogClickHandler_);
    this.adapter_.deregisterDocumentHandler('keydown', this.documentKeyDownHandler_);
    this.adapter_.deregisterWindowHandler('resize', this.windowResizeHandler_);
    this.adapter_.deregisterWindowHandler('orientationchange', this.windowResizeHandler_);
    this.adapter_.releaseFocus();
    this.adapter_.addClass(cssClasses.CLOSING);
    this.adapter_.removeClass(cssClasses.OPEN);
    this.adapter_.removeBodyClass(cssClasses.SCROLL_LOCK);
    this.adapter_.notifyClosing(action);

    clearTimeout(this.animationTimer_);
    this.animationTimer_ = setTimeout(() => {
      this.handleAnimationTimerEnd_();
      this.adapter_.notifyClosed(action);
    }, numbers.DIALOG_ANIMATION_CLOSE_TIME_MS);
  }

  isOpen() {
    return this.isOpen_;
  }

  layout() {
    requestAnimationFrame(() => {
      this.detectStackedButtons_();
      this.detectScrollableContent_();
    });
  }

  /** @private */
  detectStackedButtons_() {
    // Remove the class first to let us measure the buttons' natural positions.
    this.adapter_.removeClass(cssClasses.STACKED);
    if (this.adapter_.areButtonsStacked()) {
      this.adapter_.addClass(cssClasses.STACKED);
    }
  }

  /** @private */
  detectScrollableContent_() {
    // Remove the class first to let us measure the natural height of the content.
    this.adapter_.removeClass(cssClasses.SCROLLABLE);
    if (this.adapter_.isContentScrollable()) {
      this.adapter_.addClass(cssClasses.SCROLLABLE);
    }
  }

  /**
   * @param {!Event} evt
   * @private
   */
  handleDialogClick_(evt) {
    const {target} = evt;
    const action = this.adapter_.getActionFromEvent(evt);
    if (action) {
      this.close(action);
    }
  }

  /** @private */
  handleWindowResize_() {
    this.layout();
  }

  /**
   * @param {!KeyboardEvent} evt
   * @private
   */
  handleDocumentKeyDown_(evt) {
    if (evt.key === 'Escape' || evt.keyCode === 27) {
      this.close(strings.ESCAPE_ACTION);
    }
  }

  /** @private */
  handleAnimationTimerEnd_() {
    this.adapter_.removeClass(cssClasses.OPENING);
    this.adapter_.removeClass(cssClasses.CLOSING);
  }
}

export default MDCDialogFoundation;
