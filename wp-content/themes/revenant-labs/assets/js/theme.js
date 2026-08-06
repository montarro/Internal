/**
 * Revenant Labs — progressive enhancement.
 *
 * Two behaviours only: a shadow on the sticky header once the page scrolls,
 * and a gentle fade-and-rise on section entry. Both are additive — with this
 * script blocked, or reduced motion requested, the page is already in its
 * final state.
 */
( function () {
	'use strict';

	var prefersReducedMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' );

	/* ---------------------------------------------------------------------
	 * Sticky header shadow
	 * ------------------------------------------------------------------ */

	function initHeader() {
		var header = document.querySelector( '.rl-header' );

		if ( ! header ) {
			return;
		}

		var ticking = false;

		function update() {
			header.classList.toggle( 'is-scrolled', window.scrollY > 8 );
			ticking = false;
		}

		window.addEventListener(
			'scroll',
			function () {
				if ( ! ticking ) {
					window.requestAnimationFrame( update );
					ticking = true;
				}
			},
			{ passive: true }
		);

		update();
	}

	/* ---------------------------------------------------------------------
	 * Reveal on entry
	 *
	 * Applies to full-width top-level sections automatically, and to any block
	 * an editor gives the `rl-reveal` class to in the Site Editor.
	 *
	 * The class that actually hides an element is added here, never in the
	 * saved markup, so content is never hidden when this script does not run.
	 * Anything already within the first viewport is left alone entirely, so
	 * the hero never fades in and LCP is untouched.
	 * ------------------------------------------------------------------ */

	var REVEAL_SELECTOR = '.rl-reveal, main > .wp-block-group.alignfull';

	function initReveal() {
		var candidates = document.querySelectorAll( REVEAL_SELECTOR );

		if ( ! candidates.length ) {
			return;
		}

		if ( prefersReducedMotion.matches || ! ( 'IntersectionObserver' in window ) ) {
			return;
		}

		var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
		var targets = Array.prototype.filter.call( candidates, function ( el ) {
			// Already on screen at load: show it as-is, with no animation.
			return el.getBoundingClientRect().top >= viewportHeight;
		} );

		if ( ! targets.length ) {
			return;
		}

		var observer = new IntersectionObserver(
			function ( entries ) {
				entries.forEach( function ( entry ) {
					if ( ! entry.isIntersecting ) {
						return;
					}

					entry.target.classList.add( 'is-revealed' );
					observer.unobserve( entry.target );
				} );
			},
			{ rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
		);

		Array.prototype.forEach.call( targets, function ( target ) {
			target.classList.add( 'js-rl-reveal' );
			observer.observe( target );
		} );
	}

	/*
	 * If the visitor turns reduced motion on mid-session, drop every pending
	 * animation immediately rather than waiting for the next scroll.
	 */
	function watchMotionPreference() {
		var handler = function () {
			if ( ! prefersReducedMotion.matches ) {
				return;
			}

			Array.prototype.forEach.call(
				document.querySelectorAll( '.js-rl-reveal' ),
				function ( el ) {
					el.classList.add( 'is-revealed' );
				}
			);
		};

		if ( typeof prefersReducedMotion.addEventListener === 'function' ) {
			prefersReducedMotion.addEventListener( 'change', handler );
		}
	}

	function init() {
		initHeader();
		initReveal();
		watchMotionPreference();
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
}() );
