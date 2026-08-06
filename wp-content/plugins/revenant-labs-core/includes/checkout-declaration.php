<?php
/**
 * Checkout research-use declaration.
 *
 * A required, never pre-checked confirmation that the purchase is for
 * legitimate in-vitro laboratory research. Registered through WooCommerce's
 * additional-checkout-fields API so it is validated server-side, stored with
 * the order, and works with the Checkout block.
 *
 * @package RevenantLabsCore
 */

declare( strict_types = 1 );

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const REVENANT_LABS_DECLARATION_ID     = 'revenant-labs/research-use-declaration';
const REVENANT_LABS_DECLARATION_OPTION = 'revenant_labs_declaration_label';

/**
 * The declaration wording.
 *
 * Editable from Settings → Revenant Labs, and filterable for anyone who would
 * rather keep it in code.
 *
 * @return string
 */
function revenant_labs_core_declaration_label(): string {
	$default = __( 'I confirm I am purchasing for legitimate in-vitro laboratory research only and not for human or veterinary use.', 'revenant-labs-core' );
	$stored  = (string) get_option( REVENANT_LABS_DECLARATION_OPTION, '' );
	$label   = '' !== trim( $stored ) ? $stored : $default;

	/**
	 * Filters the checkout research-use declaration wording.
	 *
	 * @param string $label Declaration text shown beside the checkbox.
	 */
	return (string) apply_filters( 'revenant_labs_core_declaration_label', $label );
}

/**
 * The message shown when the declaration has not been confirmed.
 *
 * @return string
 */
function revenant_labs_core_declaration_error(): string {
	/**
	 * Filters the validation message for the research-use declaration.
	 *
	 * @param string $message Error message.
	 */
	return (string) apply_filters(
		'revenant_labs_core_declaration_error',
		__( 'Please confirm the research-use declaration before placing your order.', 'revenant-labs-core' )
	);
}

/**
 * Register the declaration as an order-level checkout field.
 *
 * Registration is intentionally guarded: if the API is unavailable the classic
 * fallback below takes over, so the declaration is never silently skipped.
 *
 * @return void
 */
function revenant_labs_core_register_declaration(): void {
	if ( ! function_exists( 'woocommerce_register_additional_checkout_field' ) ) {
		return;
	}

	/*
	 * Only the documented argument keys are passed. WooCommerce supplies its
	 * own required-field message for checkboxes, which keeps this working
	 * across versions instead of depending on a newer argument.
	 */
	woocommerce_register_additional_checkout_field(
		array(
			'id'       => REVENANT_LABS_DECLARATION_ID,
			'label'    => revenant_labs_core_declaration_label(),
			'location' => 'order',
			'type'     => 'checkbox',
			'required' => true,
		)
	);
}
add_action( 'woocommerce_init', 'revenant_labs_core_register_declaration' );

/**
 * Whether the block-based declaration field is in play.
 *
 * @return bool
 */
function revenant_labs_core_has_block_declaration(): bool {
	return function_exists( 'woocommerce_register_additional_checkout_field' );
}

/*
 * ---------------------------------------------------------------------------
 * Classic checkout fallback.
 *
 * Only used on installs whose WooCommerce predates the additional-fields API.
 * Same rule in both paths: unchecked by default, required, validated on the
 * server, recorded against the order.
 * ---------------------------------------------------------------------------
 */

/**
 * Render the declaration checkbox on the classic checkout.
 *
 * @return void
 */
function revenant_labs_core_classic_declaration_field(): void {
	if ( revenant_labs_core_has_block_declaration() ) {
		return;
	}

	woocommerce_form_field(
		'revenant_labs_research_declaration',
		array(
			'type'                 => 'checkbox',
			'class'                => array( 'form-row', 'rl-declaration' ),
			'label'                => revenant_labs_core_declaration_label(),
			'required'             => true,
			'custom_attributes'    => array( 'aria-required' => 'true' ),
			'default'              => '', // Never pre-checked.
		),
		''
	);
}
add_action( 'woocommerce_review_order_before_submit', 'revenant_labs_core_classic_declaration_field', 20 );

/**
 * Validate the classic declaration checkbox server-side.
 *
 * @return void
 */
function revenant_labs_core_classic_declaration_validate(): void {
	if ( revenant_labs_core_has_block_declaration() ) {
		return;
	}

	// phpcs:ignore WordPress.Security.NonceVerification.Missing -- WooCommerce verifies the checkout nonce before this hook.
	$confirmed = isset( $_POST['revenant_labs_research_declaration'] ) && '' !== $_POST['revenant_labs_research_declaration'];

	if ( $confirmed ) {
		return;
	}

	wc_add_notice( esc_html( revenant_labs_core_declaration_error() ), 'error' );
}
add_action( 'woocommerce_checkout_process', 'revenant_labs_core_classic_declaration_validate' );

/**
 * Record the classic declaration against the order.
 *
 * @param int $order_id Order ID.
 * @return void
 */
function revenant_labs_core_classic_declaration_save( int $order_id ): void {
	if ( revenant_labs_core_has_block_declaration() ) {
		return;
	}

	// phpcs:ignore WordPress.Security.NonceVerification.Missing -- WooCommerce verifies the checkout nonce before this hook.
	if ( empty( $_POST['revenant_labs_research_declaration'] ) ) {
		return;
	}

	$order = wc_get_order( $order_id );

	if ( ! $order ) {
		return;
	}

	$order->update_meta_data( '_revenant_labs_research_declaration', 'yes' );
	$order->update_meta_data( '_revenant_labs_research_declaration_text', revenant_labs_core_declaration_label() );
	$order->update_meta_data( '_revenant_labs_research_declaration_time', gmdate( 'c' ) );
	$order->save();
}
add_action( 'woocommerce_checkout_update_order_meta', 'revenant_labs_core_classic_declaration_save' );

/**
 * Show the recorded declaration on the admin order screen.
 *
 * @param WC_Order $order Order being viewed.
 * @return void
 */
function revenant_labs_core_admin_declaration( $order ): void {
	if ( ! is_a( $order, 'WC_Order' ) ) {
		return;
	}

	if ( 'yes' !== $order->get_meta( '_revenant_labs_research_declaration' ) ) {
		return;
	}

	$text = (string) $order->get_meta( '_revenant_labs_research_declaration_text' );
	$time = (string) $order->get_meta( '_revenant_labs_research_declaration_time' );

	echo '<p><strong>' . esc_html__( 'Research-use declaration', 'revenant-labs-core' ) . ':</strong> ';
	echo esc_html__( 'Confirmed at checkout.', 'revenant-labs-core' ) . '</p>';

	if ( '' !== $text ) {
		echo '<p><em>' . esc_html( $text ) . '</em></p>';
	}

	if ( '' !== $time ) {
		$timestamp = strtotime( $time );

		if ( false !== $timestamp ) {
			echo '<p>' . esc_html( wp_date( (string) get_option( 'date_format' ) . ' ' . (string) get_option( 'time_format' ), $timestamp ) ) . '</p>';
		}
	}
}
add_action( 'woocommerce_admin_order_data_after_billing_address', 'revenant_labs_core_admin_declaration' );
