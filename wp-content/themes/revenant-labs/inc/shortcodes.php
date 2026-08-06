<?php
/**
 * Small template helpers exposed as shortcodes.
 *
 * Block templates are static HTML, so the few genuinely dynamic strings in the
 * footer are exposed as shortcodes that editors can move or remove freely.
 *
 * @package RevenantLabs
 */

declare( strict_types = 1 );

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Output the current year, using the site's configured timezone.
 *
 * Usage: [rl_year]
 *
 * @return string
 */
function revenant_labs_year_shortcode(): string {
	return esc_html( wp_date( 'Y' ) );
}
add_shortcode( 'rl_year', 'revenant_labs_year_shortcode' );
