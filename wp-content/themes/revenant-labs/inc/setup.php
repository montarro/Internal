<?php
/**
 * Theme setup.
 *
 * @package RevenantLabs
 */

declare( strict_types = 1 );

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register theme supports.
 *
 * Block themes get most supports implicitly (block templates, editor styles,
 * responsive embeds, HTML5). Only the extras are declared here.
 *
 * @return void
 */
function revenant_labs_setup(): void {
	load_theme_textdomain( 'revenant-labs', REVENANT_LABS_DIR . 'languages' );

	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'custom-logo', array(
		'height'               => 96,
		'width'                => 380,
		'flex-height'          => true,
		'flex-width'           => true,
		'unlink-homepage-logo' => false,
	) );
	add_theme_support( 'html5', array( 'search-form', 'script', 'style', 'navigation-widgets' ) );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'editor-styles' );

	// Editor-only styling (placeholders, section hints, dark-panel previews).
	add_editor_style( 'assets/css/editor.css' );
}
add_action( 'after_setup_theme', 'revenant_labs_setup' );

/**
 * Add a full-width inner container ceiling for `alignfull` sections.
 *
 * theme.json controls content/wide sizes; the 1440px outer ceiling is applied
 * with a single custom property so it stays editable from one place.
 *
 * @return void
 */
function revenant_labs_content_width(): void {
	if ( ! isset( $GLOBALS['content_width'] ) ) {
		$GLOBALS['content_width'] = 1280;
	}
}
add_action( 'after_setup_theme', 'revenant_labs_content_width', 0 );

/**
 * Remove the core global-styles SVG duotone filter markup.
 *
 * Duotone is disabled in theme.json, so the extra <svg> markup core prints is
 * dead weight on every page render.
 *
 * @return void
 */
function revenant_labs_trim_duotone(): void {
	remove_action( 'wp_body_open', 'wp_global_styles_render_svg_filters' );
	remove_action( 'in_admin_header', 'wp_global_styles_render_svg_filters' );
}
add_action( 'init', 'revenant_labs_trim_duotone' );
