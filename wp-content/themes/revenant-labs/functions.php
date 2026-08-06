<?php
/**
 * Revenant Labs theme bootstrap.
 *
 * This theme is a native block theme. Presentation lives in theme.json, block
 * templates and per-block stylesheets. PHP is used only for theme setup, asset
 * loading, pattern/block-style registration and small WordPress/WooCommerce
 * integrations.
 *
 * Business-critical data (COA metadata, checkout declarations) deliberately
 * lives in the companion plugin `revenant-labs-core`, never in the theme.
 *
 * @package RevenantLabs
 */

declare( strict_types = 1 );

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'REVENANT_LABS_VERSION', '1.0.0' );
define( 'REVENANT_LABS_DIR', trailingslashit( get_theme_file_path() ) );
define( 'REVENANT_LABS_URI', trailingslashit( get_theme_file_uri() ) );

require_once REVENANT_LABS_DIR . 'inc/setup.php';
require_once REVENANT_LABS_DIR . 'inc/assets.php';
require_once REVENANT_LABS_DIR . 'inc/patterns.php';
require_once REVENANT_LABS_DIR . 'inc/block-styles.php';
require_once REVENANT_LABS_DIR . 'inc/shortcodes.php';
require_once REVENANT_LABS_DIR . 'inc/woocommerce.php';
