<?php
/**
 * Plugin Name:       Revenant Labs Core
 * Plugin URI:        https://revenantlabs.com.au/
 * Description:       Business-critical functionality for Revenant Labs: lot-level certificate-of-analysis metadata, the COA library, and the checkout research-use declaration. Kept in a plugin so this data survives any theme change.
 * Version:           1.0.0
 * Requires at least: 6.6
 * Requires PHP:      7.4
 * Author:            Revenant Labs
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       revenant-labs-core
 * Domain Path:       /languages
 *
 * @package RevenantLabsCore
 */

declare( strict_types = 1 );

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'REVENANT_LABS_CORE_VERSION', '1.0.0' );
define( 'REVENANT_LABS_CORE_FILE', __FILE__ );
define( 'REVENANT_LABS_CORE_DIR', plugin_dir_path( __FILE__ ) );
define( 'REVENANT_LABS_CORE_URL', plugin_dir_url( __FILE__ ) );

require_once REVENANT_LABS_CORE_DIR . 'includes/helpers.php';
require_once REVENANT_LABS_CORE_DIR . 'includes/class-coa-meta.php';
require_once REVENANT_LABS_CORE_DIR . 'includes/blocks.php';
require_once REVENANT_LABS_CORE_DIR . 'includes/checkout-declaration.php';
require_once REVENANT_LABS_CORE_DIR . 'includes/settings.php';

/**
 * Load translations.
 *
 * @return void
 */
function revenant_labs_core_load_textdomain(): void {
	load_plugin_textdomain( 'revenant-labs-core', false, dirname( plugin_basename( REVENANT_LABS_CORE_FILE ) ) . '/languages' );
}
add_action( 'init', 'revenant_labs_core_load_textdomain' );

/**
 * Declare compatibility with WooCommerce High-Performance Order Storage.
 *
 * This plugin stores COA data as product meta and the checkout declaration
 * through WooCommerce's own additional-fields API, so it is HPOS-safe.
 *
 * @return void
 */
function revenant_labs_core_declare_hpos(): void {
	if ( ! class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
		return;
	}

	\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', REVENANT_LABS_CORE_FILE, true );
	\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'cart_checkout_blocks', REVENANT_LABS_CORE_FILE, true );
}
add_action( 'before_woocommerce_init', 'revenant_labs_core_declare_hpos' );

/**
 * Warn — without disabling anything — when WooCommerce is not active.
 *
 * The COA library still works for documentation purposes, but product-level
 * features need WooCommerce.
 *
 * @return void
 */
function revenant_labs_core_dependency_notice(): void {
	if ( class_exists( 'WooCommerce' ) || ! current_user_can( 'activate_plugins' ) ) {
		return;
	}

	printf(
		'<div class="notice notice-warning"><p>%s</p></div>',
		esc_html__( 'Revenant Labs Core: WooCommerce is not active. Certificate-of-analysis fields and the checkout research-use declaration stay dormant until WooCommerce is activated.', 'revenant-labs-core' )
	);
}
add_action( 'admin_notices', 'revenant_labs_core_dependency_notice' );
