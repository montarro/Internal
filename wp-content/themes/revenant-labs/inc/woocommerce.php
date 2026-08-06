<?php
/**
 * WooCommerce integration.
 *
 * Everything here is presentation-level. Persistent business data (COA
 * metadata, the checkout research-use declaration) lives in the companion
 * plugin `revenant-labs-core` so it survives a theme change.
 *
 * @package RevenantLabs
 */

declare( strict_types = 1 );

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Declare WooCommerce support.
 *
 * @return void
 */
function revenant_labs_woocommerce_setup(): void {
	if ( ! class_exists( 'WooCommerce' ) ) {
		return;
	}

	add_theme_support( 'woocommerce', array(
		'thumbnail_image_width' => 640,
		'single_image_width'    => 1200,
		'product_grid'          => array(
			'default_rows'    => 3,
			'min_rows'        => 1,
			'default_columns' => 3,
			'min_columns'     => 2,
			'max_columns'     => 4,
		),
	) );

	// Only affects the classic (non-block) product template, harmless otherwise.
	add_theme_support( 'wc-product-gallery-zoom' );
	add_theme_support( 'wc-product-gallery-lightbox' );
	add_theme_support( 'wc-product-gallery-slider' );
}
add_action( 'after_setup_theme', 'revenant_labs_woocommerce_setup' );

/**
 * Use neutral wording on the variation reset link.
 *
 * Variations are used for strength and format, never for dosing. WooCommerce's
 * markup and behaviour are preserved — only the label text changes.
 *
 * @param string $link Original reset link markup.
 * @return string
 */
function revenant_labs_variation_reset_link( string $link ): string {
	return sprintf(
		'<a class="reset_variations" href="#" aria-label="%1$s">%2$s</a>',
		esc_attr__( 'Clear the selected options', 'revenant-labs' ),
		esc_html__( 'Clear selection', 'revenant-labs' )
	);
}
add_filter( 'woocommerce_reset_variations_link', 'revenant_labs_variation_reset_link' );

/**
 * Use a neutral, on-brand placeholder when a product has no image.
 *
 * Falls back to WooCommerce's own placeholder if the theme asset is absent, so
 * nothing ever renders as a broken image.
 *
 * @param string $src Placeholder image source.
 * @return string
 */
function revenant_labs_product_placeholder( string $src ): string {
	$relative = 'assets/images/product-placeholder.svg';

	if ( file_exists( REVENANT_LABS_DIR . $relative ) ) {
		return REVENANT_LABS_URI . $relative;
	}

	return $src;
}
add_filter( 'woocommerce_placeholder_img_src', 'revenant_labs_product_placeholder' );

/**
 * Number of related products shown on the single-product template.
 *
 * @param array<string, mixed> $args Related product query args.
 * @return array<string, mixed>
 */
function revenant_labs_related_products_args( array $args ): array {
	$args['posts_per_page'] = 3;
	$args['columns']        = 3;

	return $args;
}
add_filter( 'woocommerce_output_related_products_args', 'revenant_labs_related_products_args' );
