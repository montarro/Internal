<?php
/**
 * Asset loading.
 *
 * Styling is split into a small global stylesheet plus per-block stylesheets
 * that WordPress only prints when the matching block is actually rendered.
 *
 * @package RevenantLabs
 */

declare( strict_types = 1 );

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Cache-busting version for a theme asset, based on file modification time.
 *
 * @param string $relative_path Path relative to the theme root.
 * @return string
 */
function revenant_labs_asset_version( string $relative_path ): string {
	$file = REVENANT_LABS_DIR . ltrim( $relative_path, '/' );

	if ( file_exists( $file ) ) {
		return (string) filemtime( $file );
	}

	return REVENANT_LABS_VERSION;
}

/**
 * Whether self-hosted WOFF2 files have been added to /assets/fonts.
 *
 * The theme ships the @font-face declarations but no font binaries. Until the
 * licensed WOFF2 files are dropped in, the stylesheet is not enqueued at all so
 * the site never fires requests for files that do not exist.
 *
 * @return bool
 */
function revenant_labs_has_local_fonts(): bool {
	static $has_fonts = null;

	if ( null === $has_fonts ) {
		$found     = glob( REVENANT_LABS_DIR . 'assets/fonts/*.woff2' );
		$has_fonts = ! empty( $found );
	}

	return $has_fonts;
}

/**
 * Enqueue front-end assets.
 *
 * @return void
 */
function revenant_labs_enqueue_assets(): void {
	// Theme header stylesheet (metadata only) — required for child themes.
	wp_enqueue_style(
		'revenant-labs-style',
		get_stylesheet_uri(),
		array(),
		revenant_labs_asset_version( 'style.css' )
	);

	if ( revenant_labs_has_local_fonts() ) {
		wp_enqueue_style(
			'revenant-labs-fonts',
			REVENANT_LABS_URI . 'assets/css/fonts.css',
			array(),
			revenant_labs_asset_version( 'assets/css/fonts.css' )
		);
	}

	wp_enqueue_style(
		'revenant-labs-theme',
		REVENANT_LABS_URI . 'assets/css/theme.css',
		array( 'revenant-labs-style' ),
		revenant_labs_asset_version( 'assets/css/theme.css' )
	);

	/*
	 * Motion + sticky-header behaviour. ~1KB, deferred, and every effect it
	 * adds is progressive: with JS off or reduced motion on, the layout is
	 * already in its final state.
	 */
	wp_enqueue_script(
		'revenant-labs-theme',
		REVENANT_LABS_URI . 'assets/js/theme.js',
		array(),
		revenant_labs_asset_version( 'assets/js/theme.js' ),
		array(
			'strategy'  => 'defer',
			'in_footer' => true,
		)
	);

	/*
	 * The first-entry research-use notice is only needed for visitors who have
	 * not acknowledged it. Once the cookie is set the script is not enqueued at
	 * all, so returning visitors pay nothing for it.
	 */
	if ( ! isset( $_COOKIE['revenant_labs_research_notice'] ) ) {
		wp_enqueue_script(
			'revenant-labs-research-notice',
			REVENANT_LABS_URI . 'assets/js/research-notice.js',
			array(),
			revenant_labs_asset_version( 'assets/js/research-notice.js' ),
			array(
				'strategy'  => 'defer',
				'in_footer' => true,
			)
		);
	}
}
add_action( 'wp_enqueue_scripts', 'revenant_labs_enqueue_assets' );

/**
 * Register per-block stylesheets.
 *
 * WordPress loads each of these only on views where the block is present.
 *
 * @return void
 */
function revenant_labs_block_styles(): void {
	$block_styles = array(
		'core/navigation'                  => 'navigation',
		'core/search'                      => 'search',
		'core/site-logo'                   => 'site-logo',
		'core/details'                     => 'details',
		'core/button'                      => 'button',
		'core/query-pagination'            => 'pagination',
		'woocommerce/product-collection'   => 'product-collection',
		'woocommerce/product-filters'      => 'product-filters',
		'woocommerce/mini-cart'            => 'mini-cart',
		'woocommerce/cart'                 => 'cart-checkout',
		'woocommerce/checkout'             => 'cart-checkout',
		'woocommerce/product-image-gallery' => 'product-gallery',
		'woocommerce/breadcrumbs'          => 'breadcrumbs',
	);

	foreach ( $block_styles as $block_name => $file ) {
		$relative = 'assets/css/blocks/' . $file . '.css';

		if ( ! file_exists( REVENANT_LABS_DIR . $relative ) ) {
			continue;
		}

		wp_enqueue_block_style(
			$block_name,
			array(
				'handle' => 'revenant-labs-' . $file,
				'src'    => REVENANT_LABS_URI . $relative,
				'path'   => REVENANT_LABS_DIR . $relative,
				'ver'    => revenant_labs_asset_version( $relative ),
			)
		);
	}
}
add_action( 'init', 'revenant_labs_block_styles' );

/**
 * Load the block stylesheets inside the editor as well.
 *
 * `wp_enqueue_block_style` covers the front end; the editor needs the same
 * rules so patterns look identical while editing.
 *
 * @return void
 */
function revenant_labs_editor_assets(): void {
	$editor_files = glob( REVENANT_LABS_DIR . 'assets/css/blocks/*.css' );

	if ( empty( $editor_files ) ) {
		return;
	}

	foreach ( $editor_files as $file ) {
		add_editor_style( 'assets/css/blocks/' . basename( $file ) );
	}

	add_editor_style( 'assets/css/theme.css' );

	if ( revenant_labs_has_local_fonts() ) {
		add_editor_style( 'assets/css/fonts.css' );
	}
}
add_action( 'after_setup_theme', 'revenant_labs_editor_assets', 20 );

/**
 * Preload the logo image so the header does not shift on first paint.
 *
 * @return void
 */
function revenant_labs_preload_logo(): void {
	$logo_id = (int) get_theme_mod( 'custom_logo' );

	if ( ! $logo_id ) {
		return;
	}

	$src = wp_get_attachment_image_url( $logo_id, 'full' );

	if ( ! $src ) {
		return;
	}

	printf(
		'<link rel="preload" as="image" href="%s" fetchpriority="high" />' . "\n",
		esc_url( $src )
	);
}
add_action( 'wp_head', 'revenant_labs_preload_logo', 2 );
