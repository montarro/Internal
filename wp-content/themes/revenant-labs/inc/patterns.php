<?php
/**
 * Block pattern registration.
 *
 * The pattern files themselves live in /patterns and are auto-registered by
 * WordPress. This file only declares the categories they are grouped under.
 *
 * @package RevenantLabs
 */

declare( strict_types = 1 );

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register the Revenant Labs pattern categories.
 *
 * @return void
 */
function revenant_labs_register_pattern_categories(): void {
	register_block_pattern_category(
		'revenant-labs',
		array(
			'label'       => __( 'Revenant Labs', 'revenant-labs' ),
			'description' => __( 'Brand sections built for the Revenant Labs site.', 'revenant-labs' ),
		)
	);

	register_block_pattern_category(
		'revenant-labs-pages',
		array(
			'label'       => __( 'Revenant Labs · Page sections', 'revenant-labs' ),
			'description' => __( 'Reusable page-level sections such as contact and compliance blocks.', 'revenant-labs' ),
		)
	);
}
add_action( 'init', 'revenant_labs_register_pattern_categories' );
