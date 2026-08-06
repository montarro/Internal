/**
 * Revenant Labs — first-entry research-use notice.
 *
 * The notice content lives in the "Research-Use Notice (first visit)" template
 * part, so it is edited in the Site Editor and never in this file. This script
 * promotes that markup into a native <dialog>, which gives real focus
 * trapping, inertness and screen-reader dialog semantics for free.
 *
 * Behaviour notes:
 * - Nothing is pre-acknowledged; the visitor must activate the confirm control.
 * - Escape does not dismiss the notice, because dismissing it is not an
 *   acknowledgement. Focus is returned to the confirm control instead.
 * - The acknowledgement is remembered for 30 days via a cookie, with a
 *   sessionStorage fallback if cookies are unavailable.
 * - This notice does not replace the checkout research-use declaration.
 */
( function () {
	'use strict';

	var COOKIE_NAME = 'revenant_labs_research_notice';
	var COOKIE_DAYS = 30;

	function hasAcknowledged() {
		if ( document.cookie.indexOf( COOKIE_NAME + '=' ) !== -1 ) {
			return true;
		}

		try {
			return window.sessionStorage.getItem( COOKIE_NAME ) === '1';
		} catch ( e ) {
			return false;
		}
	}

	function remember() {
		var maxAge = COOKIE_DAYS * 24 * 60 * 60;
		var secure = 'https:' === window.location.protocol ? '; Secure' : '';

		document.cookie =
			COOKIE_NAME + '=1; path=/; max-age=' + maxAge + '; SameSite=Lax' + secure;

		try {
			window.sessionStorage.setItem( COOKIE_NAME, '1' );
		} catch ( e ) {
			/* Storage unavailable — the cookie above is the primary record. */
		}
	}

	/**
	 * Replace the confirm anchor with a real button.
	 *
	 * Confirming is an action, not navigation, so a <button> is the correct
	 * element for keyboard and screen-reader users.
	 *
	 * @param {Element} anchor Anchor rendered by the Button block.
	 * @return {Element} The button that replaced it.
	 */
	function toButton( anchor ) {
		var button = document.createElement( 'button' );

		button.type = 'button';
		button.className = anchor.className;
		button.textContent = anchor.textContent;

		anchor.parentNode.replaceChild( button, anchor );

		return button;
	}

	function init() {
		var notice = document.querySelector( '.rl-research-notice' );

		if ( ! notice || hasAcknowledged() ) {
			return;
		}

		var confirmEl = notice.querySelector( '.rl-notice-accept a, a.rl-notice-accept' );

		if ( ! confirmEl ) {
			return;
		}

		var dialog = document.createElement( 'dialog' );
		dialog.className = 'rl-notice-dialog';

		// Label and describe the dialog from the content the editor controls.
		var heading = notice.querySelector( 'h1, h2, h3, h4, h5, h6' );
		var body = notice.querySelector( 'p' );

		if ( heading ) {
			heading.id = heading.id || 'rl-notice-title';
			dialog.setAttribute( 'aria-labelledby', heading.id );
		} else {
			dialog.setAttribute( 'aria-label', 'Research use notice' );
		}

		if ( body ) {
			body.id = body.id || 'rl-notice-description';
			dialog.setAttribute( 'aria-describedby', body.id );
		}

		notice.parentNode.insertBefore( dialog, notice );
		dialog.appendChild( notice );

		var confirmButton = toButton( confirmEl );
		var previouslyFocused = document.activeElement;

		confirmButton.addEventListener( 'click', function () {
			remember();

			if ( typeof dialog.close === 'function' ) {
				dialog.close();
			} else {
				dialog.removeAttribute( 'open' );
			}

			if ( previouslyFocused && typeof previouslyFocused.focus === 'function' ) {
				previouslyFocused.focus();
			}
		} );

		/*
		 * Escape must not act as an acknowledgement. Cancel it and put focus
		 * back on the confirm control so keyboard users are not stranded.
		 */
		dialog.addEventListener( 'cancel', function ( event ) {
			event.preventDefault();
			confirmButton.focus();
		} );

		if ( typeof dialog.showModal === 'function' ) {
			dialog.showModal();
		} else {
			// Very old browsers: show it inline with explicit dialog semantics.
			dialog.setAttribute( 'open', 'open' );
			dialog.setAttribute( 'role', 'dialog' );
			dialog.setAttribute( 'aria-modal', 'true' );
		}

		confirmButton.focus();
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
}() );
